/**
 * Rust Diagnostics Runner
 *
 * Uses `cargo check` for fast type checking of Rust projects.
 */

import { execFileSync } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { EXTERNAL_PROCESS_TIMEOUT_MS } from './constants.js';

export interface RustDiagnostic {
  file: string;
  line: number;
  column: number;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface RustResult {
  success: boolean;
  diagnostics: RustDiagnostic[];
  errorCount: number;
  warningCount: number;
  skipped?: string;
}

/**
 * Run Cargo check diagnostics on a directory
 * @param directory - Project directory containing Cargo.toml
 * @returns Result with diagnostics
 */
export function runRustDiagnostics(directory: string): RustResult {
  const cargoPath = join(directory, 'Cargo.toml');

  if (!existsSync(cargoPath)) {
    return {
      success: true,
      diagnostics: [],
      errorCount: 0,
      warningCount: 0,
      skipped: 'no Cargo.toml found in directory'
    };
  }

  try {
    execFileSync('cargo', ['check', '--message-format=json'], {
      cwd: directory,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: EXTERNAL_PROCESS_TIMEOUT_MS
    });
    return {
      success: true,
      diagnostics: [],
      errorCount: 0,
      warningCount: 0
    };
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return {
        success: true,
        diagnostics: [],
        errorCount: 0,
        warningCount: 0,
        skipped: '`cargo` binary not found in PATH'
      };
    }
    const output = error.stdout || error.stderr || '';
    return parseRustOutput(output);
  }
}

/**
 * Parse cargo check JSON output
 *
 * Cargo with --message-format=json emits one JSON object per line.
 * We look for objects with reason='compiler-message' that contain diagnostics.
 */
export function parseRustOutput(output: string): RustResult {
  const diagnostics: RustDiagnostic[] = [];

  for (const line of output.split('\n')) {
    // Trim to handle CRLF line endings (Windows) and trailing whitespace
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    let msg: any;
    try {
      msg = JSON.parse(trimmedLine);
    } catch {
      // Skip non-JSON lines (shouldn't happen with --message-format=json on stdout)
      continue;
    }

    // Only process compiler messages
    if (msg.reason !== 'compiler-message') continue;

    const innerMessage = msg.message;
    if (!innerMessage) continue;

    // Only capture errors and warnings (skip note, help, failure-note)
    if (innerMessage.level !== 'error' && innerMessage.level !== 'warning') continue;

    // Find the primary span (main error location)
    const primarySpan = innerMessage.spans?.find((s: any) => s.is_primary);
    if (!primarySpan) continue;

    diagnostics.push({
      severity: innerMessage.level as 'error' | 'warning',
      code: innerMessage.code?.code || '',
      message: innerMessage.message,  // Note: msg.message.message
      file: primarySpan.file_name,
      line: primarySpan.line_start,
      column: primarySpan.column_start
    });
  }

  const errorCount = diagnostics.filter(d => d.severity === 'error').length;
  const warningCount = diagnostics.filter(d => d.severity === 'warning').length;

  return {
    success: errorCount === 0,
    diagnostics,
    errorCount,
    warningCount
  };
}
