/**
 * Unit tests for diagnostic output parsers
 */

import { describe, it, expect } from 'vitest';
import { parseGoOutput } from '../go-runner.js';
import { parseTscOutput } from '../tsc-runner.js';
import { parseRustOutput } from '../rust-runner.js';
import { parseMypyOutput, parsePylintOutput } from '../python-runner.js';

describe('parseGoOutput', () => {
  it('parses go vet output correctly', () => {
    const output = `main.go:10:5: unreachable code
pkg/util.go:25:12: result of fmt.Sprintf call not used`;

    const result = parseGoOutput(output);

    expect(result.diagnostics).toHaveLength(2);
    expect(result.diagnostics[0]).toMatchObject({
      file: 'main.go',
      line: 10,
      column: 5,
      message: 'unreachable code',
      severity: 'warning'
    });
    expect(result.warningCount).toBe(2);
  });

  it('returns empty for clean output', () => {
    const result = parseGoOutput('');
    expect(result.diagnostics).toHaveLength(0);
    expect(result.success).toBe(true);
  });

  it('parses Windows-style paths correctly', () => {
    const output = `C:\\Users\\dev\\project\\main.go:10:5: unreachable code`;
    const result = parseGoOutput(output);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].file).toBe('C:\\Users\\dev\\project\\main.go');
    expect(result.diagnostics[0].line).toBe(10);
    expect(result.diagnostics[0].column).toBe(5);
  });

  it('handles Unicode filenames', () => {
    const output = `pkg/日本語.go:5:3: unreachable code`;
    const result = parseGoOutput(output);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].file).toBe('pkg/日本語.go');
  });

  it('handles malformed output gracefully', () => {
    const result = parseGoOutput('not valid output\nrandom noise\n');
    expect(result.diagnostics).toHaveLength(0);
    expect(result.success).toBe(true);
  });
});

describe('parseTscOutput', () => {
  it('parses tsc errors correctly', () => {
    const output = `src/index.ts(10,5): error TS2345: Argument of type 'string' is not assignable to parameter of type 'number'.
src/utils.ts(25,12): error TS2304: Cannot find name 'foo'.`;

    const result = parseTscOutput(output);

    expect(result.diagnostics).toHaveLength(2);
    expect(result.errorCount).toBe(2);
    expect(result.warningCount).toBe(0);
    expect(result.success).toBe(false);
    expect(result.diagnostics[0]).toMatchObject({
      file: 'src/index.ts',
      line: 10,
      column: 5,
      code: 'TS2345',
      severity: 'error',
      message: "Argument of type 'string' is not assignable to parameter of type 'number'."
    });
  });

  it('parses tsc warnings correctly', () => {
    const output = `src/index.ts(5,1): warning TS6133: 'x' is declared but its value is never read.`;

    const result = parseTscOutput(output);

    expect(result.diagnostics).toHaveLength(1);
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(1);
    expect(result.success).toBe(true);
  });

  it('returns empty for clean output', () => {
    const result = parseTscOutput('');
    expect(result.diagnostics).toHaveLength(0);
    expect(result.success).toBe(true);
  });

  it('parses Windows-style paths correctly', () => {
    const output = `C:\\Users\\dev\\src\\index.ts(10,5): error TS2345: Type mismatch.`;
    const result = parseTscOutput(output);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].file).toBe('C:\\Users\\dev\\src\\index.ts');
  });
});

describe('parseRustOutput', () => {
  it('parses cargo check JSON errors', () => {
    // Cargo JSON format: one JSON object per line
    const output = [
      '{"reason":"compiler-message","package_id":"test","manifest_path":"/test/Cargo.toml","target":{"name":"test"},"message":{"message":"borrow of moved value: `x`","code":{"code":"E0382","explanation":null},"level":"error","spans":[{"file_name":"src/main.rs","line_start":5,"line_end":5,"column_start":20,"column_end":21,"is_primary":true,"text":[],"label":null}],"children":[],"rendered":null}}',
      '{"reason":"compiler-message","package_id":"test","manifest_path":"/test/Cargo.toml","target":{"name":"test"},"message":{"message":"unused variable: `y`","code":null,"level":"warning","spans":[{"file_name":"src/lib.rs","line_start":10,"line_end":10,"column_start":9,"column_end":10,"is_primary":true,"text":[],"label":null}],"children":[],"rendered":null}}'
    ].join('\n');

    const result = parseRustOutput(output);

    expect(result.diagnostics).toHaveLength(2);
    expect(result.errorCount).toBe(1);
    expect(result.warningCount).toBe(1);
    expect(result.diagnostics[0]).toMatchObject({
      file: 'src/main.rs',
      line: 5,
      column: 20,
      code: 'E0382',
      severity: 'error',
      message: 'borrow of moved value: `x`'
    });
  });

  it('returns empty for clean output', () => {
    // Empty output or only build-finished message
    const result = parseRustOutput('');
    expect(result.diagnostics).toHaveLength(0);
    expect(result.success).toBe(true);
  });

  it('ignores non-compiler-message JSON lines', () => {
    const output = [
      '{"reason":"compiler-artifact","package_id":"test","target":{"name":"test"}}',
      '{"reason":"build-finished","success":false}',
      '{"reason":"compiler-message","package_id":"test","manifest_path":"/test/Cargo.toml","target":{"name":"test"},"message":{"message":"type mismatch","code":{"code":"E0308","explanation":null},"level":"error","spans":[{"file_name":"src/main.rs","line_start":3,"line_end":3,"column_start":18,"column_end":25,"is_primary":true,"text":[],"label":null}],"children":[],"rendered":null}}'
    ].join('\n');

    const result = parseRustOutput(output);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].file).toBe('src/main.rs');
    expect(result.diagnostics[0].code).toBe('E0308');
  });

  it('handles warnings without error codes', () => {
    const output = '{"reason":"compiler-message","package_id":"test","manifest_path":"/test/Cargo.toml","target":{"name":"test"},"message":{"message":"unused variable: `x`","code":null,"level":"warning","spans":[{"file_name":"src/lib.rs","line_start":3,"line_end":3,"column_start":9,"column_end":10,"is_primary":true,"text":[],"label":null}],"children":[],"rendered":null}}';

    const result = parseRustOutput(output);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].code).toBe('');
    expect(result.diagnostics[0].severity).toBe('warning');
  });

  it('skips messages without primary span', () => {
    // Message with no spans or no primary span should be skipped
    const output = '{"reason":"compiler-message","package_id":"test","manifest_path":"/test/Cargo.toml","target":{"name":"test"},"message":{"message":"some note","code":null,"level":"note","spans":[],"children":[],"rendered":null}}';

    const result = parseRustOutput(output);
    expect(result.diagnostics).toHaveLength(0);
  });

  it('uses primary span when multiple spans exist', () => {
    // Multiple spans, only primary should be used for location
    const output = '{"reason":"compiler-message","package_id":"test","manifest_path":"/test/Cargo.toml","target":{"name":"test"},"message":{"message":"mismatched types","code":{"code":"E0308","explanation":null},"level":"error","spans":[{"file_name":"src/other.rs","line_start":1,"line_end":1,"column_start":1,"column_end":2,"is_primary":false,"text":[],"label":"expected"},{"file_name":"src/main.rs","line_start":10,"line_end":10,"column_start":5,"column_end":15,"is_primary":true,"text":[],"label":"found"}],"children":[],"rendered":null}}';

    const result = parseRustOutput(output);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].file).toBe('src/main.rs');
    expect(result.diagnostics[0].line).toBe(10);
    expect(result.diagnostics[0].column).toBe(5);
  });
});

describe('parseMypyOutput', () => {
  it('parses mypy errors', () => {
    const output = `main.py:10:5: error: Incompatible types [arg-type]
utils.py:25:1: warning: Unused variable [unused-variable]
main.py:15:1: note: See docs for details`;

    const result = parseMypyOutput(output);

    expect(result.diagnostics).toHaveLength(2); // note should be skipped
    expect(result.errorCount).toBe(1);
    expect(result.warningCount).toBe(1);
    expect(result.tool).toBe('mypy');
  });

  it('returns empty for clean output', () => {
    const result = parseMypyOutput('');
    expect(result.diagnostics).toHaveLength(0);
    expect(result.success).toBe(true);
  });

  it('parses Windows-style mypy paths', () => {
    const output = `C:\\Users\\dev\\main.py:10:5: error: Incompatible types [arg-type]`;
    const result = parseMypyOutput(output);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].file).toBe('C:\\Users\\dev\\main.py');
  });
});

describe('parsePylintOutput', () => {
  it('parses pylint errors', () => {
    const output = `main.py:10:5: E0001: syntax error
main.py:20:0: W0611: Unused import`;

    const result = parsePylintOutput(output);

    expect(result.diagnostics).toHaveLength(2);
    expect(result.errorCount).toBe(1);
    expect(result.warningCount).toBe(1);
    expect(result.tool).toBe('pylint');
  });

  it('returns empty for clean output', () => {
    const result = parsePylintOutput('');
    expect(result.diagnostics).toHaveLength(0);
    expect(result.success).toBe(true);
  });

  it('classifies F (Fatal) codes as errors', () => {
    const output = `main.py:1:0: F0001: error in module (fatal)`;
    const result = parsePylintOutput(output);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].severity).toBe('error');
    expect(result.errorCount).toBe(1);
  });

  it('parses Windows-style pylint paths', () => {
    const output = `C:\\Users\\dev\\main.py:10:5: E0001: syntax error`;
    const result = parsePylintOutput(output);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].file).toBe('C:\\Users\\dev\\main.py');
  });
});
