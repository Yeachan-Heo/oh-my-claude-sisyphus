/**
 * Prompt Injection Helper
 *
 * Shared utilities for injecting system prompts into Codex/Gemini MCP tools.
 * Enables agents to pass their personality/guidelines when consulting external models.
 */

import { readdirSync } from 'fs';
import { join, dirname, basename, resolve, relative, isAbsolute, sep } from 'path';
import { fileURLToPath } from 'url';
import { loadAgentPrompt } from '../agents/utils.js';
import type { ExternalModelProvider } from '../shared/types.js';

/**
 * Build-time injected agent roles list.
 * esbuild replaces this with the actual roles array during bridge builds.
 * In dev/test (unbundled), this remains undefined and we fall back to runtime scan.
 */
declare const __AGENT_ROLES__: string[] | undefined;

/**
 * Get the package root directory.
 * Handles both ESM (import.meta.url) and CJS bundle (__dirname) contexts.
 * When esbuild bundles to CJS, import.meta is replaced with {} so we
 * fall back to __dirname which is natively available in CJS.
 */
function getPackageDir(): string {
  try {
    // ESM path (works in dev via ts/dist)
    if (import.meta?.url) {
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = dirname(__filename);
      // From src/mcp/ or dist/mcp/ go up to package root
      return join(__dirname, '..', '..');
    }
  } catch {
    // import.meta.url unavailable — fall through to CJS path
  }
  // CJS bundle path: __dirname is available natively in CJS.
  // From bridge/ go up 1 level to package root.
  if (typeof __dirname !== 'undefined') {
    return join(__dirname, '..');
  }
  // Last resort: use process.cwd()
  return process.cwd();
}

/**
 * Agent role name validation regex.
 * Allows only lowercase letters, numbers, and hyphens.
 * This is the security check - the actual role existence is handled by loadAgentPrompt.
 */
const AGENT_ROLE_NAME_REGEX = /^[a-z0-9-]+$/;

/**
 * Check if a role name is valid (contains only allowed characters).
 * This is a security check, not an allowlist check.
 */
export function isValidAgentRoleName(name: string): boolean {
  return AGENT_ROLE_NAME_REGEX.test(name);
}

/**
 * Discover valid agent roles.
 * Uses build-time injected list when available (CJS bundles),
 * falls back to runtime filesystem scan (dev/test).
 * Cached after first call.
 */
let _cachedRoles: string[] | null = null;

export function getValidAgentRoles(): string[] {
  if (_cachedRoles) return _cachedRoles;

  // Prefer build-time injected roles (always available in CJS bundles)
  try {
    if (typeof __AGENT_ROLES__ !== 'undefined' && Array.isArray(__AGENT_ROLES__) && __AGENT_ROLES__.length > 0) {
      _cachedRoles = __AGENT_ROLES__;
      return _cachedRoles;
    }
  } catch {
    // __AGENT_ROLES__ not defined — fall through to runtime scan
  }

  // Runtime fallback: scan agents/ directory (dev/test environments)
  try {
    const agentsDir = join(getPackageDir(), 'agents');
    const files = readdirSync(agentsDir);
    _cachedRoles = files
      .filter(f => f.endsWith('.md'))
      .map(f => basename(f, '.md'))
      .sort();
  } catch (err) {
    // Fail closed: elevated error logging so startup issues are visible
    console.error('[prompt-injection] CRITICAL: Could not scan agents/ directory for role discovery:', err);
    _cachedRoles = [];
  }

  return _cachedRoles;
}

/**
 * Valid agent roles discovered from build-time injection or runtime scan.
 * Computed at module load time for backward compatibility.
 */
export const VALID_AGENT_ROLES: readonly string[] = getValidAgentRoles();

/**
 * AgentRole type - now string since roles are dynamic.
 */
export type AgentRole = string;

/**
 * Resolve the system prompt from either explicit system_prompt or agent_role.
 * system_prompt takes precedence over agent_role.
 *
 * Returns undefined if neither is provided or resolution fails.
 */
export function resolveSystemPrompt(
  systemPrompt?: string,
  agentRole?: string,
  provider?: ExternalModelProvider
): string | undefined {
  // Explicit system_prompt takes precedence
  if (systemPrompt && systemPrompt.trim()) {
    return systemPrompt.trim();
  }

  // Fall back to agent_role lookup
  if (agentRole && agentRole.trim()) {
    const role = agentRole.trim();
    // loadAgentPrompt already validates the name and handles errors gracefully
    const prompt = loadAgentPrompt(role, provider);
    // loadAgentPrompt returns "Agent: {name}\n\nPrompt unavailable." on failure
    if (prompt.includes('Prompt unavailable')) {
      console.warn(`[prompt-injection] Agent role "${role}" prompt not found, skipping injection`);
      return undefined;
    }
    return prompt;
  }

  return undefined;
}

/**
 * Wrap CLI response content with untrusted delimiters to prevent prompt injection.
 * Used for inline CLI responses that are returned directly to the caller.
 */
export function wrapUntrustedCliResponse(content: string, metadata: { source: string; tool: string }): string {
  return `\n--- UNTRUSTED CLI RESPONSE (${metadata.tool}:${metadata.source}) ---\n${content}\n--- END UNTRUSTED CLI RESPONSE ---\n`;
}

export function singleErrorBlock(text: string): { content: [{ type: 'text'; text: string }]; isError: true } {
  return { content: [{ type: 'text' as const, text }], isError: true as const };
}

export function inlineSuccessBlocks(metadataText: string, wrappedResponse: string): { content: [{ type: 'text'; text: string }, { type: 'text'; text: string }]; isError: false } {
  return {
    content: [
      { type: 'text' as const, text: metadataText },
      { type: 'text' as const, text: wrappedResponse },
    ],
    isError: false as const,
  };
}

/**
 * Header prepended to all prompts sent to subagent CLIs (Codex/Gemini).
 * Prevents recursive subagent spawning and rate limit cascade issues.
 */
export const SUBAGENT_HEADER = '[SUBAGENT MODE] You are running as a subagent. DO NOT spawn additional subagents or call Codex/Gemini CLI recursively. Focus only on your assigned task.';

/**
 * Build the full prompt with system prompt prepended.
 *
 * Order: subagent_header > system_prompt > file_context > user_prompt
 *
 * Uses clear XML-like delimiters so the external model can distinguish sections.
 * File context is wrapped with untrusted data warnings to mitigate prompt injection.
 */
export function buildPromptWithSystemContext(
  userPrompt: string,
  fileContext: string | undefined,
  systemPrompt: string | undefined
): string {
  const parts: string[] = [];

  parts.push(SUBAGENT_HEADER);

  if (systemPrompt) {
    parts.push(`<system-instructions>\n${systemPrompt}\n</system-instructions>`);
  }

  if (fileContext) {
    parts.push(fileContext);
  }

  parts.push(userPrompt);

  return parts.join('\n\n');
}

/**
 * Validate context file paths to prevent path traversal and prompt injection.
 *
 * Checks performed:
 * - Control characters (newlines, carriage returns, null bytes) in the path string
 *   would inject content into the prompt when paths are interpolated. Rejected as
 *   E_CONTEXT_FILE_INJECTION.
 * - Paths that resolve outside baseDir (e.g. '../../../etc/passwd') are rejected as
 *   E_CONTEXT_FILE_TRAVERSAL, unless allowExternal is true (matches isExternalPromptAllowed()).
 *
 * Returns { validPaths, errors } so callers can log rejections and proceed with valid paths.
 */
export function validateContextFilePaths(
  filePaths: string[],
  baseDir: string,
  allowExternal = false
): { validPaths: string[]; errors: string[] } {
  const validPaths: string[] = [];
  const errors: string[] = [];

  for (const filePath of filePaths) {
    // Reject paths containing control characters — these would be injected verbatim
    // into the prompt string when paths are interpolated, bypassing trust boundaries.
    if (/[\n\r\0]/.test(filePath)) {
      errors.push(`E_CONTEXT_FILE_INJECTION: Rejected path with control characters: ${JSON.stringify(filePath)}`);
      continue;
    }

    if (!allowExternal) {
      // Resolve against baseDir and check the result stays within it.
      const resolved = resolve(baseDir, filePath);
      const rel = relative(baseDir, resolved);
      if (rel === '..' || rel.startsWith('..' + sep) || isAbsolute(rel)) {
        errors.push(`E_CONTEXT_FILE_TRAVERSAL: Rejected path outside working directory '${baseDir}': ${filePath}`);
        continue;
      }
    }

    validPaths.push(filePath);
  }

  return { validPaths, errors };
}
