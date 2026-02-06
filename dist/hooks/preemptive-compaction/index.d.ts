/**
 * Preemptive Compaction Hook
 *
 * Monitors context usage and warns before hitting the context limit.
 * Encourages proactive compaction to prevent context overflow.
 *
 * Adapted from oh-my-opencode's preemptive-compaction hook.
 *
 * Note: This is a simplified version for Claude Code's shell hook system.
 * The original uses OpenCode's plugin event system for automatic summarization.
 * This version injects warning messages to prompt manual compaction.
 */
import type { ContextUsageResult, PreemptiveCompactionConfig } from './types.js';
/**
 * Estimate tokens from text content
 */
export declare function estimateTokens(text: string): number;
/**
 * Analyze context usage based on conversation content
 */
export declare function analyzeContextUsage(content: string, config?: PreemptiveCompactionConfig): ContextUsageResult;
/**
 * Create preemptive compaction hook
 *
 * This hook monitors context usage and injects warning messages
 * when approaching the context limit.
 */
export declare function createPreemptiveCompactionHook(config?: PreemptiveCompactionConfig): {
    /**
     * PostToolUse - Check context usage after large tool outputs
     */
    postToolUse: (input: {
        tool_name: string;
        session_id: string;
        tool_input: Record<string, unknown>;
        tool_response?: string;
    }) => string | null;
    /**
     * Stop event - Check context before stopping
     */
    stop: (input: {
        session_id: string;
    }) => string | null;
};
/**
 * Get estimated token usage for a session
 */
export declare function getSessionTokenEstimate(sessionId: string): number;
/**
 * Reset token estimate for a session (e.g., after compaction)
 */
export declare function resetSessionTokenEstimate(sessionId: string): void;
export type { ContextUsageResult, PreemptiveCompactionConfig, } from './types.js';
export { DEFAULT_THRESHOLD, CRITICAL_THRESHOLD, COMPACTION_COOLDOWN_MS, MAX_WARNINGS, CLAUDE_DEFAULT_CONTEXT_LIMIT, CHARS_PER_TOKEN, CONTEXT_WARNING_MESSAGE, CONTEXT_CRITICAL_MESSAGE, } from './constants.js';
//# sourceMappingURL=index.d.ts.map