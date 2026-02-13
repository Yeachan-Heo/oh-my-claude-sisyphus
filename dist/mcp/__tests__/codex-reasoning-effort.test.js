import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { VALID_REASONING_EFFORTS, executeCodex, executeCodexWithFallback, } from '../codex-core.js';
// Mock child_process.spawn to capture CLI args
vi.mock('child_process', () => ({
    spawn: vi.fn(),
}));
// Mock dependencies
vi.mock('../shared-exec.js', () => ({
    createStdoutCollector: vi.fn(() => ({
        append: vi.fn(),
        toString: () => '{"type":"item.completed","item":{"type":"agent_message","text":"test response"}}',
    })),
    safeWriteOutputFile: vi.fn(() => ({ success: true })),
}));
vi.mock('../cli-detection.js', () => ({
    detectCodexCli: vi.fn(() => ({ available: true })),
}));
vi.mock('../../lib/worktree-paths.js', () => ({
    getWorktreeRoot: vi.fn(() => null),
}));
vi.mock('../mcp-config.js', () => ({
    isExternalPromptAllowed: vi.fn(() => false),
}));
describe('VALID_REASONING_EFFORTS', () => {
    it('should contain all five valid effort levels', () => {
        expect(VALID_REASONING_EFFORTS).toEqual(['minimal', 'low', 'medium', 'high', 'xhigh']);
    });
    it('should have exactly 5 entries', () => {
        expect(VALID_REASONING_EFFORTS).toHaveLength(5);
    });
});
describe('executeCodex reasoning effort', () => {
    let spawnMock;
    beforeEach(async () => {
        const cp = await import('child_process');
        spawnMock = cp.spawn;
        spawnMock.mockReset();
    });
    afterEach(() => {
        vi.restoreAllMocks();
    });
    function setupSpawnMock() {
        const stdinWrite = vi.fn();
        const stdinEnd = vi.fn();
        const stdinOn = vi.fn();
        const stdoutOn = vi.fn((event, cb) => {
            if (event === 'data') {
                // Simulate successful JSON output
                cb(Buffer.from('{"type":"item.completed","item":{"type":"agent_message","text":"ok"}}\n'));
            }
        });
        const stderrOn = vi.fn();
        const childOn = vi.fn((event, cb) => {
            if (event === 'close') {
                // Simulate successful exit
                setTimeout(() => cb(0), 10);
            }
        });
        const mockChild = {
            stdin: { write: stdinWrite, end: stdinEnd, on: stdinOn },
            stdout: { on: stdoutOn },
            stderr: { on: stderrOn },
            on: childOn,
            kill: vi.fn(),
            pid: 12345,
        };
        spawnMock.mockReturnValue(mockChild);
        return mockChild;
    }
    it('should NOT include -c flag when reasoningEffort is undefined', async () => {
        setupSpawnMock();
        const promise = executeCodex('test prompt', 'gpt-5.3-codex', undefined, undefined);
        await promise;
        const [, spawnArgs] = spawnMock.mock.calls[0];
        expect(spawnArgs).toEqual(['exec', '-m', 'gpt-5.3-codex', '--json', '--full-auto']);
        expect(spawnArgs).not.toContain('-c');
    });
    it('should include -c model_reasoning_effort when reasoningEffort is "low"', async () => {
        setupSpawnMock();
        const promise = executeCodex('test prompt', 'gpt-5.3-codex', undefined, 'low');
        await promise;
        const [, spawnArgs] = spawnMock.mock.calls[0];
        expect(spawnArgs).toContain('-c');
        expect(spawnArgs).toContain('model_reasoning_effort="low"');
    });
    it('should include -c model_reasoning_effort when reasoningEffort is "xhigh"', async () => {
        setupSpawnMock();
        const promise = executeCodex('test prompt', 'gpt-5.3-codex', undefined, 'xhigh');
        await promise;
        const [, spawnArgs] = spawnMock.mock.calls[0];
        expect(spawnArgs).toContain('-c');
        expect(spawnArgs).toContain('model_reasoning_effort="xhigh"');
    });
    it.each(VALID_REASONING_EFFORTS)('should accept reasoning effort "%s"', async (effort) => {
        setupSpawnMock();
        const promise = executeCodex('test prompt', 'gpt-5.3-codex', undefined, effort);
        await promise;
        const [, spawnArgs] = spawnMock.mock.calls[0];
        expect(spawnArgs).toContain('-c');
        expect(spawnArgs).toContain(`model_reasoning_effort="${effort}"`);
    });
    it('should NOT include -c flag for invalid reasoning effort value', async () => {
        setupSpawnMock();
        const promise = executeCodex('test prompt', 'gpt-5.3-codex', undefined, 'invalid');
        await promise;
        const [, spawnArgs] = spawnMock.mock.calls[0];
        expect(spawnArgs).not.toContain('-c');
    });
});
describe('executeCodexWithFallback reasoning effort passthrough', () => {
    it('should pass reasoningEffort to the executor function', async () => {
        const mockExecutor = vi.fn().mockResolvedValue('test response');
        const mockSleep = vi.fn().mockResolvedValue(undefined);
        await executeCodexWithFallback('test prompt', 'gpt-5.3-codex', // explicit model
        undefined, // cwd
        undefined, // fallbackChain
        { executor: mockExecutor, sleepFn: mockSleep }, 'high');
        expect(mockExecutor).toHaveBeenCalledWith('test prompt', 'gpt-5.3-codex', undefined, 'high');
    });
    it('should pass undefined reasoningEffort when not specified', async () => {
        const mockExecutor = vi.fn().mockResolvedValue('test response');
        const mockSleep = vi.fn().mockResolvedValue(undefined);
        await executeCodexWithFallback('test prompt', 'gpt-5.3-codex', undefined, undefined, { executor: mockExecutor, sleepFn: mockSleep }, undefined);
        expect(mockExecutor).toHaveBeenCalledWith('test prompt', 'gpt-5.3-codex', undefined, undefined);
    });
    it('should preserve reasoningEffort across fallback chain retries', async () => {
        const mockExecutor = vi.fn()
            .mockRejectedValueOnce(new Error('Codex model error: model_not_found'))
            .mockResolvedValueOnce('fallback response');
        const mockSleep = vi.fn().mockResolvedValue(undefined);
        const result = await executeCodexWithFallback('test prompt', undefined, // no explicit model -> use fallback chain
        undefined, ['gpt-5.3-codex', 'gpt-5.2-codex'], { executor: mockExecutor, sleepFn: mockSleep }, 'low');
        // First call with primary model
        expect(mockExecutor.mock.calls[0][3]).toBe('low');
        // Second call with fallback model
        expect(mockExecutor.mock.calls[1][3]).toBe('low');
        expect(result.usedFallback).toBe(true);
        expect(result.actualModel).toBe('gpt-5.2-codex');
    });
});
//# sourceMappingURL=codex-reasoning-effort.test.js.map