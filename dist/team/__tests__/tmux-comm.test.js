import { describe, it, expect, vi } from 'vitest';
import { sendTmuxTrigger } from '../tmux-comm.js';
// Mock child_process
vi.mock('child_process', () => ({
    execFile: vi.fn(),
}));
vi.mock('util', () => ({
    promisify: (fn) => (...args) => {
        return new Promise((resolve, reject) => {
            fn(...args, (err, stdout) => {
                if (err)
                    reject(err);
                else
                    resolve({ stdout: stdout ?? '', stderr: '' });
            });
        });
    },
}));
describe('sendTmuxTrigger', () => {
    it('returns false on tmux error (does not throw)', async () => {
        const { execFile } = await import('child_process');
        execFile.mockImplementation((...args) => {
            const cb = args[args.length - 1];
            cb(new Error('tmux not found'));
        });
        const result = await sendTmuxTrigger('%99', 'check-inbox');
        expect(result).toBe(false);
    });
    it('truncates messages over 200 chars', async () => {
        const { execFile } = await import('child_process');
        const calls = [];
        execFile.mockImplementation((...args) => {
            calls.push(args);
            const cb = args[args.length - 1];
            cb(null, '');
        });
        const longMsg = 'a'.repeat(300);
        await sendTmuxTrigger('%1', longMsg);
        const sentMessage = calls[0][1][4]; // execFile('tmux', ['send-keys', '-t', paneId, '-l', msg], cb) → args[1][4]
        expect(sentMessage.length).toBeLessThanOrEqual(200);
    });
});
//# sourceMappingURL=tmux-comm.test.js.map