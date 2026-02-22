import { join } from 'path';
/**
 * Typed path builders for all team state files.
 * All paths are relative to cwd.
 *
 * State layout:
 *   .omc/state/team/{teamName}/
 *     config.json
 *     shutdown.json
 *     tasks/
 *       {taskId}.json
 *     workers/
 *       {workerName}/
 *         heartbeat.json
 *         inbox.md
 *         outbox.jsonl
 *         .ready          ← sentinel file (worker writes on startup)
 *         AGENTS.md       ← worker overlay
 *         shutdown-ack.json
 *     mailbox/
 *       {workerName}.jsonl
 */
export const TeamPaths = {
    root: (teamName) => `.omc/state/team/${teamName}`,
    config: (teamName) => `.omc/state/team/${teamName}/config.json`,
    shutdown: (teamName) => `.omc/state/team/${teamName}/shutdown.json`,
    tasks: (teamName) => `.omc/state/team/${teamName}/tasks`,
    taskFile: (teamName, taskId) => `.omc/state/team/${teamName}/tasks/${taskId}.json`,
    workers: (teamName) => `.omc/state/team/${teamName}/workers`,
    workerDir: (teamName, workerName) => `.omc/state/team/${teamName}/workers/${workerName}`,
    heartbeat: (teamName, workerName) => `.omc/state/team/${teamName}/workers/${workerName}/heartbeat.json`,
    inbox: (teamName, workerName) => `.omc/state/team/${teamName}/workers/${workerName}/inbox.md`,
    outbox: (teamName, workerName) => `.omc/state/team/${teamName}/workers/${workerName}/outbox.jsonl`,
    ready: (teamName, workerName) => `.omc/state/team/${teamName}/workers/${workerName}/.ready`,
    overlay: (teamName, workerName) => `.omc/state/team/${teamName}/workers/${workerName}/AGENTS.md`,
    shutdownAck: (teamName, workerName) => `.omc/state/team/${teamName}/workers/${workerName}/shutdown-ack.json`,
    done: (teamName, workerName) => `.omc/state/team/${teamName}/workers/${workerName}/done.json`,
    mailbox: (teamName, workerName) => `.omc/state/team/${teamName}/mailbox/${workerName}.jsonl`,
};
/**
 * Get absolute path for a team state file.
 */
export function absPath(cwd, relativePath) {
    return join(cwd, relativePath);
}
/**
 * Get absolute root path for a team's state directory.
 */
export function teamStateRoot(cwd, teamName) {
    return join(cwd, TeamPaths.root(teamName));
}
//# sourceMappingURL=state-paths.js.map