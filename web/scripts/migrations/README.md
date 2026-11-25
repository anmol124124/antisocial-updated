# Applied migrations (history)

One-off scripts that built up the live CMS between October and November 2026, in date order.
**They have all been run on the live CMS. Don't run them again.**

Their combined result is now captured in `cms/schema/snapshot.json` (collections, fields,
relations) and `cms/schema/website-policy.json` (the website's permissions). A new or existing
Directus is brought up to date with one command:

```bash
DIRECTUS_URL=… DIRECTUS_EMAIL=… DIRECTUS_PASSWORD=… node cms/scripts/provision.mjs
```

They are kept because their comments explain *why* fields and content are the way they are.
New schema changes: make them in a local Directus, re-export the snapshot (see `cms/README.md`),
and commit it. No new dated scripts.
