/**
 * Prompt Injection Helper
 *
 * Shared utilities for injecting system prompts into Codex/Gemini MCP tools.
 * Enables agents to pass their personality/guidelines when consulting external models.
 */
/**
 * Valid agent roles that can be used with agent_role parameter.
 * Matches the agent prompt files in agents/*.md
 */
export declare const VALID_AGENT_ROLES: readonly ["architect", "architect-medium", "architect-low", "analyst", "critic", "planner", "executor", "executor-high", "executor-low", "deep-executor", "designer", "designer-low", "designer-high", "explore", "explore-medium", "explore-high", "researcher", "researcher-low", "writer", "vision", "qa-tester", "qa-tester-high", "scientist", "scientist-low", "scientist-high", "security-reviewer", "security-reviewer-low", "build-fixer", "build-fixer-low", "tdd-guide", "tdd-guide-low", "code-reviewer", "code-reviewer-low", "git-master"];
export type AgentRole = typeof VALID_AGENT_ROLES[number];
/**
 * Resolve the system prompt from either explicit system_prompt or agent_role.
 * system_prompt takes precedence over agent_role.
 *
 * Returns undefined if neither is provided or resolution fails.
 */
export declare function resolveSystemPrompt(systemPrompt?: string, agentRole?: string): string | undefined;
/**
 * Build the full prompt with system prompt prepended.
 *
 * Order: system_prompt > file_context > user_prompt
 *
 * Uses clear XML-like delimiters so the external model can distinguish sections.
 */
export declare function buildPromptWithSystemContext(userPrompt: string, fileContext: string | undefined, systemPrompt: string | undefined): string;
//# sourceMappingURL=prompt-injection.d.ts.map