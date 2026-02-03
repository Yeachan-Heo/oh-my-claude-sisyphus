import { describe, it, expect } from "vitest";
import {
  createOutputTruncatorHook,
  smartTruncate,
  shouldTruncateTool,
  DEFAULT_CONFIG,
  type PostToolUseInput,
} from "../index.js";

const createInput = (toolName: string, response: string): PostToolUseInput => ({
  tool_name: toolName,
  session_id: "test-session",
  tool_input: {},
  tool_response: response,
});

describe("Output Truncator Hook", () => {
  describe("DEFAULT_CONFIG", () => {
    it("should have correct default values", () => {
      expect(DEFAULT_CONFIG.enabled).toBe(true);
      expect(DEFAULT_CONFIG.maxOutputChars).toBe(200000);
      expect(DEFAULT_CONFIG.maxOutputTokens).toBe(50000);
      expect(DEFAULT_CONFIG.targetHeadroom).toBe(0.5);
      expect(DEFAULT_CONFIG.minSizeToTruncate).toBe(5000);
      expect(DEFAULT_CONFIG.truncatableTools).toContain("Grep");
      expect(DEFAULT_CONFIG.truncatableTools).toContain("Glob");
      expect(DEFAULT_CONFIG.truncatableTools).toContain("Read");
      expect(DEFAULT_CONFIG.truncatableTools).toContain("Bash");
    });
  });

  describe("shouldTruncateTool", () => {
    const config = DEFAULT_CONFIG;

    it("should return true for truncatable tools", () => {
      expect(shouldTruncateTool("Grep", config)).toBe(true);
      expect(shouldTruncateTool("Glob", config)).toBe(true);
      expect(shouldTruncateTool("Read", config)).toBe(true);
      expect(shouldTruncateTool("Bash", config)).toBe(true);
    });

    it("should be case-insensitive", () => {
      expect(shouldTruncateTool("grep", config)).toBe(true);
      expect(shouldTruncateTool("GREP", config)).toBe(true);
      expect(shouldTruncateTool("GrEp", config)).toBe(true);
    });

    it("should return false for non-truncatable tools", () => {
      expect(shouldTruncateTool("Write", config)).toBe(false);
      expect(shouldTruncateTool("Edit", config)).toBe(false);
      expect(shouldTruncateTool("Task", config)).toBe(false);
    });
  });

  describe("smartTruncate", () => {
    const config = DEFAULT_CONFIG;

    it("should not truncate content below minSizeToTruncate", () => {
      const smallContent = "a".repeat(1000);
      const result = smartTruncate(smallContent, config);

      expect(result.wasTruncated).toBe(false);
      expect(result.truncated).toBe(smallContent);
      expect(result.originalSize).toBe(1000);
      expect(result.truncatedSize).toBe(1000);
    });

    it("should not truncate content within maxOutputChars", () => {
      const mediumContent = "a".repeat(10000);
      const result = smartTruncate(mediumContent, config);

      expect(result.wasTruncated).toBe(false);
      expect(result.truncated).toBe(mediumContent);
    });

    it("should truncate content exceeding maxOutputChars", () => {
      const largeContent = "a".repeat(250000);
      const result = smartTruncate(largeContent, config);

      expect(result.wasTruncated).toBe(true);
      expect(result.truncatedSize).toBeLessThan(result.originalSize);
      expect(result.originalSize).toBe(250000);
    });

    it("should use line-based truncation for multi-line content", () => {
      const lines = Array(15000).fill("This is a test line").join("\n");
      const result = smartTruncate(lines, config);

      expect(result.wasTruncated).toBe(true);
      expect(result.reason).toBe("Line-based truncation applied");
      expect(result.truncated).toContain("more lines truncated");
    });

    it("should use block-based truncation for single-line content", () => {
      const singleLine = "x".repeat(250000);
      const result = smartTruncate(singleLine, config);

      expect(result.wasTruncated).toBe(true);
      expect(result.reason).toBe("Block-based truncation applied");
      expect(result.truncated).toContain("characters truncated");
    });

    it("should add truncation message when truncating", () => {
      const largeContent = "a".repeat(250000);
      const result = smartTruncate(largeContent, config);

      expect(result.truncated).toContain(config.truncationMessage);
    });
  });

  describe("createOutputTruncatorHook", () => {
    it("should return hook with postToolUse handler", () => {
      const hook = createOutputTruncatorHook();

      expect(hook).toHaveProperty("postToolUse");
      expect(typeof hook.postToolUse).toBe("function");
    });

    it("should return no-op hook when disabled", () => {
      const hook = createOutputTruncatorHook({ enabled: false });
      const result = hook.postToolUse(createInput("Grep", "a".repeat(250000)));

      expect(result).toBeNull();
    });

    it("should return null for non-truncatable tools", () => {
      const hook = createOutputTruncatorHook();
      const result = hook.postToolUse(createInput("Write", "a".repeat(250000)));

      expect(result).toBeNull();
    });

    it("should return null when no tool_response", () => {
      const hook = createOutputTruncatorHook();
      const result = hook.postToolUse(createInput("Grep", ""));

      expect(result).toBeNull();
    });

    it("should return truncated content for large Grep output", () => {
      const hook = createOutputTruncatorHook();
      const largeOutput = "a".repeat(250000);
      const result = hook.postToolUse(createInput("Grep", largeOutput));

      expect(result).not.toBeNull();
      expect(result!.length).toBeLessThan(largeOutput.length);
    });

    it("should respect context window state when provided", () => {
      const hook = createOutputTruncatorHook({}, () => ({
        totalSize: 100000,
        currentUsage: 80000,
      }));

      const largeOutput = "a".repeat(50000);
      const result = hook.postToolUse(createInput("Grep", largeOutput));

      expect(result).not.toBeNull();
    });

    it("should return null when content is small enough", () => {
      const hook = createOutputTruncatorHook();
      const smallOutput = "a".repeat(100);
      const result = hook.postToolUse(createInput("Grep", smallOutput));

      expect(result).toBeNull();
    });
  });

  describe("Context-aware truncation", () => {
    it("should truncate more aggressively when context is nearly full", () => {
      const getContextState = () => ({
        totalSize: 100000,
        currentUsage: 95000,
      });

      const hook = createOutputTruncatorHook({}, getContextState);
      const output = "a".repeat(15000);
      const result = hook.postToolUse(createInput("Grep", output));

      expect(result).not.toBeNull();
      expect(result!.length).toBeLessThan(output.length);
    });

    it("should allow larger outputs when context has plenty of room", () => {
      const getContextState = () => ({
        totalSize: 500000,
        currentUsage: 10000,
      });

      const hook = createOutputTruncatorHook({}, getContextState);
      const output = "a".repeat(100000);
      const result = hook.postToolUse(createInput("Grep", output));

      expect(result).toBeNull();
    });
  });
});
