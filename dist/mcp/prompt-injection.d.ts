/**
 * Prompt Injection Helper
 *
 * Shared utilities for injecting system prompts into Codex/Gemini MCP tools.
 * Enables agents to pass their personality/guidelines when consulting external models.
 */
import type { ExternalModelProvider } from '../shared/types.js';
/**
 * Check if a role name is valid (contains only allowed characters).
 * This is a security check, not an allowlist check.
 */
export declare function isValidAgentRoleName(name: string): boolean;
export declare function getValidAgentRoles(): string[];
/**
 * Valid agent roles discovered from build-time injection or runtime scan.
 * Computed at module load time for backward compatibility.
 */
export declare const VALID_AGENT_ROLES: readonly string[];
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
export declare function resolveSystemPrompt(systemPrompt?: string, agentRole?: string, provider?: ExternalModelProvider): string | undefined;
/**
 * Wrap CLI response content with untrusted delimiters to prevent prompt injection.
 * Used for inline CLI responses that are returned directly to the caller.
 */
export declare function wrapUntrustedCliResponse(content: string, metadata: {
    source: string;
    tool: string;
}): string;
export declare function singleErrorBlock(text: string): {
    content: [{
        type: 'text';
        text: string;
    }];
    isError: true;
};
export declare function inlineSuccessBlocks(metadataText: string, wrappedResponse: string): {
    content: [{
        type: 'text';
        text: string;
    }, {
        type: 'text';
        text: string;
    }];
    isError: false;
};
/**
 * Header prepended to all prompts sent to subagent CLIs (Codex/Gemini).
 * Prevents recursive subagent spawning and rate limit cascade issues.
 */
export declare const SUBAGENT_HEADER = "[SUBAGENT MODE] You are running as a subagent. DO NOT spawn additional subagents or call Codex/Gemini CLI recursively. Focus only on your assigned task.";
/**
 * Build the full prompt with system prompt prepended.
 *
 * Order: subagent_header > system_prompt > file_context > user_prompt
 *
 * Uses clear XML-like delimiters so the external model can distinguish sections.
 * File context is wrapped with untrusted data warnings to mitigate prompt injection.
 */
export declare function buildPromptWithSystemContext(userPrompt: string, fileContext: string | undefined, systemPrompt: string | undefined): string;
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
export declare function validateContextFilePaths(filePaths: string[], baseDir: string, allowExternal?: boolean): {
    validPaths: string[];
    errors: string[];
};
//# sourceMappingURL=prompt-injection.d.ts.map