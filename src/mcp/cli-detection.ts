// DEPRECATED: Use src/team/cli-detection.ts instead
export * from '../team/cli-detection.js';

import { execSync } from 'child_process';

export interface CliDetectionResult {
  available: boolean;
  path?: string;
  version?: string;
  error?: string;
  installHint: string;
}

// Session-level cache for detection results
let codexCache: CliDetectionResult | null = null;
let geminiCache: CliDetectionResult | null = null;

/**
 * @deprecated Use isCliAvailable('codex') from src/team/cli-detection.ts instead
 */
export function detectCodexCli(useCache = true): CliDetectionResult {
  if (useCache && codexCache) return codexCache;

  const installHint = 'Install Codex CLI: npm install -g @openai/codex';

  try {
    const command = process.platform === 'win32' ? 'where codex' : 'which codex';
    const path = execSync(command, { encoding: 'utf-8', timeout: 5000 }).trim();
    let version: string | undefined;
    try {
      version = execSync('codex --version', { encoding: 'utf-8', timeout: 5000 }).trim();
    } catch {
      // Version check is optional
    }

    const result: CliDetectionResult = { available: true, path, version, installHint };
    codexCache = result;
    return result;
  } catch {
    const result: CliDetectionResult = {
      available: false,
      error: 'Codex CLI not found on PATH',
      installHint
    };
    codexCache = result;
    return result;
  }
}

/**
 * @deprecated Use isCliAvailable('gemini') from src/team/cli-detection.ts instead
 */
export function detectGeminiCli(useCache = true): CliDetectionResult {
  if (useCache && geminiCache) return geminiCache;

  const installHint = 'Install Gemini CLI: npm install -g @google/gemini-cli (see https://github.com/google-gemini/gemini-cli)';

  try {
    const command = process.platform === 'win32' ? 'where gemini' : 'which gemini';
    const path = execSync(command, { encoding: 'utf-8', timeout: 5000 }).trim();
    let version: string | undefined;
    try {
      version = execSync('gemini --version', { encoding: 'utf-8', timeout: 5000 }).trim();
    } catch {
      // Version check is optional
    }

    const result: CliDetectionResult = { available: true, path, version, installHint };
    geminiCache = result;
    return result;
  } catch {
    const result: CliDetectionResult = {
      available: false,
      error: 'Gemini CLI not found on PATH',
      installHint
    };
    geminiCache = result;
    return result;
  }
}

/**
 * Reset detection cache (useful for testing)
 * @deprecated Use detectCli() from src/team/cli-detection.ts which has no cache
 */
export function resetDetectionCache(): void {
  codexCache = null;
  geminiCache = null;
}
