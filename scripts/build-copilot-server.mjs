#!/usr/bin/env node
/**
 * Build script for standalone Copilot MCP server bundle
 * Bundles the Copilot MCP server into a standalone JS file for plugin distribution
 */

import * as esbuild from 'esbuild';
import { mkdir } from 'fs/promises';

// Output to bridge/ directory (not gitignored) for plugin distribution
const outfile = 'bridge/copilot-server.cjs';

// Ensure output directory exists
await mkdir('bridge', { recursive: true });

// Preamble: resolve global npm modules so externalized native packages
// can be found when running from plugin cache
const banner = `
// Resolve global npm modules for native package imports
try {
  var _cp = require('child_process');
  var _Module = require('module');
  var _globalRoot = _cp.execSync('npm root -g', { encoding: 'utf8', timeout: 5000 }).trim();
  if (_globalRoot) {
    process.env.NODE_PATH = _globalRoot + (process.env.NODE_PATH ? ':' + process.env.NODE_PATH : '');
    _Module._initPaths();
  }
} catch (_e) { /* npm not available */ }
`;

await esbuild.build({
  entryPoints: ['src/mcp/copilot-standalone-server.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile,
  banner: { js: banner },
  external: [
    'fs', 'path', 'os', 'util', 'stream', 'events',
    'buffer', 'crypto', 'http', 'https', 'url',
    'child_process', 'assert', 'module', 'net', 'tls',
    'dns', 'readline', 'tty', 'worker_threads',
    '@ast-grep/napi',
    'better-sqlite3',
  ],
});

console.log(`Built ${outfile}`);
