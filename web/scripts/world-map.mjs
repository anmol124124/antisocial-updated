// Builds the dotted world map for the home page's Chapters section from Natural Earth
// country outlines (world-atlas TopoJSON). Writes a TS module of SVG path strings:
// one dot per grid cell that is land; the USA (lower 48), India and the UAE apart.
//
//   curl -o countries-50m.json https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-50m.json
//   node scripts/world-map.mjs countries-50m.json src/components/home/worldMap.ts
import { readFileSync, writeFileSync } from 'node:fs';

const [src, out] = process.argv.slice(2);
const topo = JSON.parse(readFileSync(src, 'utf8'));
const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;

const arcs = topo.arcs.map((arc) => {
  let x = 0, y = 0;
  return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; });
});
const arcPts = (i) => (i >= 0 ? arcs[i] : arcs[~i].slice().reverse());
const ring = (ids) => ids.flatMap((id, k) => (k ? arcPts(id).slice(1) : arcPts(id)));

const countries = topo.objects.countries.geometries.map((g) => {
  const polys = g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : [];
  const rings = polys.map((p) => p.map(ring));
  return { id: g.id, name: g.properties?.name, polys: rings };
});

const bboxOf = (pts) => pts.reduce((b, [x, y]) => [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)], [Infinity, Infinity, -Infinity, -Infinity]);
// A polygon that crosses the 180th meridian (Chukotka, Fiji) is shifted onto 0..360,
// and tested against the point's longitude shifted the same way.
const polys = countries.flatMap((c) =>
  c.polys.map((rings) => {
    const b = bboxOf(rings.flat());
    if (b[2] - b[0] <= 180) return { id: c.id, rings, bbox: b, wrap: false };
    const shifted = rings.map((r) => r.map(([x, y]) => [x < 0 ? x + 360 : x, y]));
    return { id: c.id, rings: shifted, bbox: bboxOf(shifted.flat()), wrap: true };
  }),
);

function inRing(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function countryAt(lon0, lat) {
  for (const p of polys) {
    const lon = p.wrap && lon0 < 0 ? lon0 + 360 : lon0;
    const [x0, y0, x1, y1] = p.bbox;
    if (lon < x0 || lon > x1 || lat < y0 || lat > y1) continue;
    let inside = false;
    for (const r of p.rings) if (inRing(lon, lat, r)) inside = !inside;
    if (inside) return p.id;
  }
  return null;
}

// Grid: 2 degrees, longitude -180..180, latitude 78 down to -56 (no Antarctica).
const STEP = 2, LON0 = -180, LAT0 = 78, COLS = 180, ROWS = 67;
const lower48 = (lon, lat) => lon > -128 && lon < -60 && lat > 23 && lat < 50;
const groups = { land: [], usa: [], india: [], uae: [] };
for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    const lon = LON0 + (c + 0.5) * STEP, lat = LAT0 - (r + 0.5) * STEP;
    // The centre and four points around it, so coasts and islands keep their shape.
    const q = STEP / 4;
    const hits = [[0, 0], [-q, -q], [q, -q], [-q, q], [q, q]].map(([a, b]) => countryAt(lon + a, lat + b)).filter(Boolean);
    if (!hits.length) continue;
    const id = countryAt(lon, lat) || hits[0];
    const g = id === '840' && lower48(lon, lat) ? 'usa' : id === '356' ? 'india' : id === '784' ? 'uae' : 'land';
    groups[g].push([c, r]);
  }
}

// Each horizontal run of dots is one segment; a dashed stroke puts a dot on every cell.
function path(cells) {
  const rows = new Map();
  for (const [c, r] of cells) rows.set(r, [...(rows.get(r) || []), c]);
  let d = '';
  for (const [r, cs] of [...rows].sort((a, b) => a[0] - b[0])) {
    cs.sort((a, b) => a - b);
    for (let i = 0; i < cs.length; ) {
      let j = i;
      while (j + 1 < cs.length && cs[j + 1] === cs[j] + 1) j++;
      d += `M${cs[i]} ${r}h${j - i + 0.5}`;
      i = j + 1;
    }
  }
  return d;
}

const body = `// Generated from Natural Earth country outlines (public domain, via world-atlas@2.0.2,
// countries-50m), on a ${STEP}-degree grid: longitude -180 to 180, latitude ${LAT0} to ${LAT0 - ROWS * STEP}.
// One dot per cell that is land. Made by scripts/world-map.mjs: regenerate rather than edit by hand.

/** The grid: ${COLS} columns by ${ROWS} rows, one unit per cell, a dot at each whole number. */
export const MAP_COLS = ${COLS};
export const MAP_ROWS = ${ROWS};

/** Longitude and latitude to grid units. */
export function mapPoint(lon: number, lat: number): [number, number] {
  return [(lon + ${-LON0}) / ${STEP} - 0.5, (${LAT0} - lat) / ${STEP} - 0.5];
}

/** Every land cell outside the three highlighted countries. */
export const LAND = '${path(groups.land)}';

/** The USA (lower 48 states), India and the UAE. */
export const USA = '${path(groups.usa)}';
export const INDIA = '${path(groups.india)}';
export const UAE = '${path(groups.uae)}';
`;
writeFileSync(out, body);
console.log(Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.length])), `${body.length} bytes`);
