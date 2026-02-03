/**
 * Smart Output Truncator Hook
 *
 * Dynamically truncates tool output based on context window usage
 * to prevent context overflow. Inspired by oh-my-opencode's implementation.
 */

import type {
  OutputTruncatorConfig,
  ContextWindowState,
  TruncationResult,
  PostToolUseInput,
} from "./types.js";
import { DEFAULT_CONFIG } from "./types.js";

export type {
  OutputTruncatorConfig,
  ContextWindowState,
  TruncationResult,
  PostToolUseInput,
};
export { DEFAULT_CONFIG };

const CHARS_PER_TOKEN_ESTIMATE = 4;

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN_ESTIMATE);
}

function calculateMaxOutputSize(
  config: Required<OutputTruncatorConfig>,
  contextState?: ContextWindowState,
): number {
  if (!contextState?.totalSize || !contextState?.currentUsage) {
    return config.maxOutputChars;
  }

  const remainingTokens = contextState.totalSize - contextState.currentUsage;
  const targetTokens = Math.floor(remainingTokens * config.targetHeadroom);
  const maxTokens = Math.min(targetTokens, config.maxOutputTokens);
  return maxTokens * CHARS_PER_TOKEN_ESTIMATE;
}

function truncateByLines(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content;
  }

  const lines = content.split("\n");
  const resultLines: string[] = [];
  let currentSize = 0;
  const reserveChars = 200;

  for (const line of lines) {
    const lineSize = line.length + 1;
    if (currentSize + lineSize > maxChars - reserveChars) {
      break;
    }
    resultLines.push(line);
    currentSize += lineSize;
  }

  const remaining = lines.length - resultLines.length;
  if (remaining > 0) {
    resultLines.push(`\n... [${remaining} more lines truncated]`);
  }

  return resultLines.join("\n");
}

function truncateByBlocks(content: string, maxChars: number): string {
  if (content.length <= maxChars) {
    return content;
  }

  const halfMax = Math.floor((maxChars - 100) / 2);
  const head = content.slice(0, halfMax);
  const tail = content.slice(-halfMax);
  const truncatedChars = content.length - halfMax * 2;

  return `${head}\n\n... [${truncatedChars} characters truncated] ...\n\n${tail}`;
}

export function smartTruncate(
  content: string,
  config: Required<OutputTruncatorConfig>,
  contextState?: ContextWindowState,
): TruncationResult {
  const originalSize = content.length;

  if (originalSize < config.minSizeToTruncate) {
    return {
      original: content,
      truncated: content,
      wasTruncated: false,
      originalSize,
      truncatedSize: originalSize,
    };
  }

  const maxSize = calculateMaxOutputSize(config, contextState);

  if (originalSize <= maxSize) {
    return {
      original: content,
      truncated: content,
      wasTruncated: false,
      originalSize,
      truncatedSize: originalSize,
    };
  }

  let truncated: string;
  let reason: string;

  if (content.includes("\n")) {
    truncated = truncateByLines(content, maxSize);
    reason = "Line-based truncation applied";
  } else {
    truncated = truncateByBlocks(content, maxSize);
    reason = "Block-based truncation applied";
  }

  truncated += config.truncationMessage;

  return {
    original: content,
    truncated,
    wasTruncated: true,
    originalSize,
    truncatedSize: truncated.length,
    reason,
  };
}

export function shouldTruncateTool(
  toolName: string,
  config: Required<OutputTruncatorConfig>,
): boolean {
  const normalizedTool = toolName.toLowerCase();
  return config.truncatableTools.some(
    (t) => t.toLowerCase() === normalizedTool,
  );
}

export function createOutputTruncatorHook(
  config?: OutputTruncatorConfig,
  getContextState?: () => ContextWindowState | undefined,
) {
  const mergedConfig: Required<OutputTruncatorConfig> = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  if (!mergedConfig.enabled) {
    return {
      postToolUse: () => null,
    };
  }

  return {
    postToolUse: (input: PostToolUseInput): string | null => {
      const { tool_name, tool_response } = input;

      if (!tool_response) {
        return null;
      }

      if (!shouldTruncateTool(tool_name, mergedConfig)) {
        return null;
      }

      const contextState = getContextState?.();
      const result = smartTruncate(tool_response, mergedConfig, contextState);

      if (result.wasTruncated) {
        return result.truncated;
      }

      return null;
    },
  };
}

export default createOutputTruncatorHook;
