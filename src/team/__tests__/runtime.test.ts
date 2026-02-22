import { describe, it, expect } from 'vitest';
import type { TeamConfig, TeamRuntime } from '../runtime.js';

describe('runtime types', () => {
  it('TeamConfig has required fields', () => {
    const config: TeamConfig = {
      teamName: 'test',
      workerCount: 2,
      agentTypes: ['codex', 'gemini'],
      tasks: [{ subject: 'Task 1', description: 'Do something' }],
      cwd: '/tmp',
    };
    expect(config.teamName).toBe('test');
    expect(config.workerCount).toBe(2);
  });
});
