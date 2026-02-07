
/**
 * Kimi MCP Core - Shared business logic for Kimi-CLI integration
 *
 * This module contains all the business logic for the Kimi-CLI integration.
 */

import { spawn, execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

// Default configuration
export const KIMI_DEFAULT_MODEL = process.env.OMC_KIMI_DEFAULT_MODEL || 'moonshot-v1-8k'; // Example model
export const KIMI_TIMEOUT = parseInt(process.env.OMC_KIMI_TIMEOUT || '300000', 10);

// Kimi-CLI detection
let kimiCliPath: string | null = null;
let detectionAttempted = false;

/**
 * Detect if Kimi-CLI is installed and available
 */
export function detectKimiCli(): string | null {
  if (detectionAttempted) {
    return kimiCliPath;
  }
  
  detectionAttempted = true;
  
  try {
    // Kimi is installed via `uv`, check the uv bin dir
    const uvHome = process.env.UV_HOME || (process.env.HOME ? join(process.env.HOME, '.uv') : null);
    if (uvHome && existsSync(join(uvHome, 'bin', 'kimi'))) {
      kimiCliPath = join(uvHome, 'bin', 'kimi');
      console.log(`[kimi-core] Found Kimi-CLI at: ${kimiCliPath}`);
      return kimiCliPath;
    }

    // Fallback to checking PATH
    const result = execSync('which kimi 2>/dev/null', {
      encoding: 'utf-8',
      timeout: 5000
    }).trim();
    
    if (result) {
      kimiCliPath = result.split('\\n')[0].trim();
      console.log(`[kimi-core] Found Kimi-CLI in PATH at: ${kimiCliPath}`);
      return kimiCliPath;
    }
  } catch {
    // CLI not found
  }
  
  console.log('[kimi-core] Kimi-CLI not found. Install with: curl -LsSf https://code.kimi.com/install.sh | bash');
  return null;
}

/**
 * Run a prompt with Kimi-CLI
 */
export async function runKimiPrompt(options: {
  prompt: string;
  model?: string;
  files?: string[];
  workingDirectory?: string;
}): Promise<{
  success: boolean;
  result?: string;
  error?: string;
}> {
  const cli = detectKimiCli();
  if (!cli) {
    return {
      success: false,
      error: 'Kimi-CLI not found. Install with: curl -LsSf https://code.kimi.com/install.sh | bash'
    };
  }
  
  const model = options.model || KIMI_DEFAULT_MODEL;
  const cwd = options.workingDirectory || process.cwd();
  
  return new Promise((resolve) => {
    // We will pipe the prompt to the interactive kimi session
    const child = spawn(cli, ['--model', model], {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: KIMI_TIMEOUT
    });
    
    let stdout = '';
    let stderr = '';

    // Construct full prompt with file context
    let fullPrompt = options.prompt;
    if (options.files && options.files.length > 0) {
      const fileContents = options.files.map(f => `--- ${f} ---\\n${readFileSync(join(cwd, f), 'utf-8')}`).join('\\n\\n');
      fullPrompt = `Context files:\\n${fileContents}\\n\\n---\\n\\nTask: ${options.prompt}`;
    }

    // Write the prompt to stdin
    child.stdin.write(fullPrompt + '\\n');
    child.stdin.end();
    
    child.stdout?.on('data', (data) => {
      stdout += data.toString();
    });
    
    child.stderr?.on('data', (data) => {
      stderr += data.toString();
    });
    
    child.on('close', (code) => {
      // Kimi-CLI is interactive, so we parse the output to find the agent's response
      const response = stdout.split('Kimi:').pop()?.trim() || stdout.trim();
      if (code === 0 || response) {
        resolve({
          success: true,
          result: response
        });
      } else {
        resolve({
          success: false,
          error: stderr || `Process exited with code ${code}`
        });
      }
    });
    
    child.on('error', (err) => {
      resolve({
        success: false,
        error: err.message
      });
    });
  });
}
