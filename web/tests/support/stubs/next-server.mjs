// The real NextResponse, loaded through CommonJS so its named export resolves.
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const server = require('next/server');

export const NextResponse = server.NextResponse;
export const NextRequest = server.NextRequest;
