/**
 * Types for Smart Output Truncator Hook
 *
 * Dynamically truncates tool output based on context window usage
 * to prevent context overflow while preserving important information.
 */

/**
 * Configuration for output truncation
 */
export interface OutputTruncatorConfig {
  /** Whether the hook is enabled */
  enabled?: boolean;

  /**
   * Target headroom as percentage of context window (0-1)
   * Default: 0.5 (50% headroom)
   */
  targetHeadroom?: number;

  /**
   * Maximum output size in tokens (estimated)
   * Default: 50000
   */
  maxOutputTokens?: number;

  /**
   * Maximum output size in characters (fallback)
   * Default: 200000 (roughly 50k tokens)
   */
  maxOutputChars?: number;

  /**
   * Minimum output size to consider for truncation
   * Default: 5000 characters
   */
  minSizeToTruncate?: number;

  /**
   * Tools that should have their output truncated
   * Default: ['Grep', 'Glob', 'Read', 'Bash', 'lsp_find_references', 'lsp_workspace_symbols', 'ast_grep_search']
   */
  truncatableTools?: string[];

  /**
   * Custom truncation message
   */
  truncationMessage?: string;
}

/**
 * Context window state for calculating truncation limits
 */
export interface ContextWindowState {
  /** Current token usage */
  currentUsage?: number;
  /** Total context window size */
  totalSize?: number;
  /** Usage percentage (0-100) */
  usedPercentage?: number;
}

/**
 * Truncation result
 */
export interface TruncationResult {
  /** Original content */
  original: string;
  /** Truncated content */
  truncated: string;
  /** Whether truncation was applied */
  wasTruncated: boolean;
  /** Original size in characters */
  originalSize: number;
  /** Truncated size in characters */
  truncatedSize: number;
  /** Reason for truncation */
  reason?: string;
}

/**
 * Input for the PostToolUse hook
 */
export interface PostToolUseInput {
  tool_name: string;
  session_id: string;
  tool_input: Record<string, unknown>;
  tool_response?: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Required<OutputTruncatorConfig> = {
  enabled: true,
  targetHeadroom: 0.5,
  maxOutputTokens: 50000,
  maxOutputChars: 200000,
  minSizeToTruncate: 5000,
  truncatableTools: [
    "Grep",
    "Glob",
    "Read",
    "Bash",
    "lsp_find_references",
    "lsp_workspace_symbols",
    "ast_grep_search",
    "ast_grep_replace",
  ],
  truncationMessage:
    "\n\n[Output truncated to fit context window. Use more specific queries or pagination for full results.]",
};
