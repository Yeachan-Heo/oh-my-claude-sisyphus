import { describe, test, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtempSync, readFileSync, existsSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { persistPrompt, persistResponse } from "../mcp/prompt-persistence.js";
import { getSisyphusConfig } from "../features/auto-update.js";

vi.mock("../features/auto-update.js", () => ({
  getSisyphusConfig: vi.fn(() => ({ silentAutoUpdate: false })),
}));

const mockGetSisyphusConfig = vi.mocked(getSisyphusConfig);

describe("prompt-persistence", () => {
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), "omc-prompts-"));
    process.chdir(tempDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(tempDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  test("returns undefined when prompt persistence is disabled", () => {
    mockGetSisyphusConfig.mockReturnValue({
      silentAutoUpdate: false,
      promptPersistence: { enabled: false },
    });

    const result = persistPrompt({
      provider: "codex",
      agentRole: "code-reviewer",
      model: "test-model",
      prompt: "Test prompt",
      fullPrompt: "System\n\nTest prompt",
    });

    expect(result).toBeUndefined();
    expect(existsSync(join(tempDir, ".omc", "prompts"))).toBe(false);
  });

  test("sanitizes bidi characters when enabled", () => {
    mockGetSisyphusConfig.mockReturnValue({
      silentAutoUpdate: false,
      promptPersistence: { enabled: true },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const bidiText = "safe\u202Eevil";
    const result = persistPrompt({
      provider: "codex",
      agentRole: "code-reviewer",
      model: "test-model",
      prompt: bidiText,
      fullPrompt: `System\n\n${bidiText}`,
    });

    expect(result?.filePath).toBeDefined();
    const content = readFileSync(result!.filePath, "utf-8");
    expect(content).not.toContain("\u202E");
    expect(content).not.toContain("safe\u202Eevil");
    expect(content).toContain("safeevil");
    expect(warnSpy).toHaveBeenCalled();
  });

  test("sanitizes responses when enabled", () => {
    mockGetSisyphusConfig.mockReturnValue({
      silentAutoUpdate: false,
      promptPersistence: { enabled: true },
    });
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const response = "hello\u200Fworld";
    const filePath = persistResponse({
      provider: "codex",
      agentRole: "code-reviewer",
      model: "test-model",
      promptId: "abc12345",
      slug: "test",
      response,
    });

    expect(filePath).toBeDefined();
    const content = readFileSync(filePath!, "utf-8");
    expect(content).not.toContain("\u200F");
    expect(content).toContain("helloworld");
    expect(warnSpy).toHaveBeenCalled();
  });
});
