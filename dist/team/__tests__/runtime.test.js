import { describe, it, expect } from 'vitest';
describe('runtime types', () => {
    it('TeamConfig has required fields', () => {
        const config = {
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
//# sourceMappingURL=runtime.test.js.map