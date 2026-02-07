
import { build } from 'esbuild';
import { builtinModules } from 'module';

build({
  entryPoints: ['src/mcp/kimi-standalone-server.ts'],
  bundle: true,
  outfile: 'bridge/kimi-server.cjs',
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  external: [...builtinModules, 'better-sqlite3'],
  banner: {
    js: `
// Resolve global npm modules
try {
  var _cp = require('child_process');
  var _Module = require('module');
  var _globalRoot = _cp.execSync('npm root -g', { encoding: 'utf8', timeout: 5000 }).trim();
  if (_globalRoot) {
    process.env.NODE_PATH = _globalRoot + (process.env.NODE_PATH ? ':' + process.env.NODE_PATH : '');
    _Module._initPaths();
  }
} catch (_e) { /* ignore */ }
`
  }
}).catch(() => process.exit(1));

console.log('Built bridge/kimi-server.cjs');
