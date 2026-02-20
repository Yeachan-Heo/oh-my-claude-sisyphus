import { describe, it, expect } from 'vitest';
import { isExcludedCommand, detectSlashCommand } from '../hooks/auto-slash-command/detector.js';
import { processHook } from '../hooks/bridge.js';
describe('omc: namespace shorthand (issue #785)', () => {
    describe('auto-slash-command exclusion', () => {
        it('should exclude bare "omc" command from auto-expansion', () => {
            // /omc:autopilot is parsed as command="omc" by SLASH_COMMAND_PATTERN
            // because ":" is not matched by [\w-]
            expect(isExcludedCommand('omc')).toBe(true);
        });
        it('should exclude omc: prefixed commands from auto-expansion', () => {
            expect(isExcludedCommand('omc:ralplan')).toBe(true);
            expect(isExcludedCommand('omc:ultraqa')).toBe(true);
            expect(isExcludedCommand('omc:learner')).toBe(true);
            expect(isExcludedCommand('omc:plan')).toBe(true);
            expect(isExcludedCommand('omc:cancel')).toBe(true);
        });
        it('should return null for /omc:* slash commands in detectSlashCommand', () => {
            // /omc:autopilot should not be detected as an auto-slash command
            // because "omc" is excluded
            const result = detectSlashCommand('/omc:autopilot some args');
            expect(result).toBeNull();
        });
    });
    describe('bridge processPreToolUse - Skill tool omc: rewrite', () => {
        it('should inject alias correction when Skill tool uses omc: prefix', async () => {
            const result = await processHook('pre-tool-use', {
                toolName: 'Skill',
                toolInput: { skill: 'omc:autopilot' },
                directory: process.cwd(),
            });
            expect(result.continue).toBe(true);
            expect(result.message).toContain('oh-my-claudecode:autopilot');
            expect(result.message).toContain('OMC NAMESPACE ALIAS');
        });
        it('should inject alias correction for various omc: skill names', async () => {
            for (const skillName of ['ralph', 'cancel', 'team', 'ultrawork', 'plan']) {
                const result = await processHook('pre-tool-use', {
                    toolName: 'Skill',
                    toolInput: { skill: `omc:${skillName}` },
                    directory: process.cwd(),
                });
                expect(result.continue).toBe(true);
                expect(result.message).toContain(`oh-my-claudecode:${skillName}`);
            }
        });
        it('should not intercept Skill tool with oh-my-claudecode: prefix', async () => {
            const result = await processHook('pre-tool-use', {
                toolName: 'Skill',
                toolInput: { skill: 'oh-my-claudecode:autopilot' },
                directory: process.cwd(),
            });
            // Should pass through to normal pre-tool-use processing
            expect(result.continue).toBe(true);
            // Should NOT contain the alias correction message
            if (result.message) {
                expect(result.message).not.toContain('OMC NAMESPACE ALIAS');
            }
        });
        it('should not intercept non-Skill tool calls', async () => {
            const result = await processHook('pre-tool-use', {
                toolName: 'Bash',
                toolInput: { command: 'echo test' },
                directory: process.cwd(),
            });
            expect(result.continue).toBe(true);
            if (result.message) {
                expect(result.message).not.toContain('OMC NAMESPACE ALIAS');
            }
        });
    });
});
//# sourceMappingURL=omc-shorthand.test.js.map