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
  root: (teamName: string) =>
    `.omc/state/team/${teamName}`,

  config: (teamName: string) =>
    `.omc/state/team/${teamName}/config.json`,

  shutdown: (teamName: string) =>
    `.omc/state/team/${teamName}/shutdown.json`,

  tasks: (teamName: string) =>
    `.omc/state/team/${teamName}/tasks`,

  taskFile: (teamName: string, taskId: string) =>
    `.omc/state/team/${teamName}/tasks/${taskId}.json`,

  workers: (teamName: string) =>
    `.omc/state/team/${teamName}/workers`,

  workerDir: (teamName: string, workerName: string) =>
    `.omc/state/team/${teamName}/workers/${workerName}`,

  heartbeat: (teamName: string, workerName: string) =>
    `.omc/state/team/${teamName}/workers/${workerName}/heartbeat.json`,

  inbox: (teamName: string, workerName: string) =>
    `.omc/state/team/${teamName}/workers/${workerName}/inbox.md`,

  outbox: (teamName: string, workerName: string) =>
    `.omc/state/team/${teamName}/workers/${workerName}/outbox.jsonl`,

  ready: (teamName: string, workerName: string) =>
    `.omc/state/team/${teamName}/workers/${workerName}/.ready`,

  overlay: (teamName: string, workerName: string) =>
    `.omc/state/team/${teamName}/workers/${workerName}/AGENTS.md`,

  shutdownAck: (teamName: string, workerName: string) =>
    `.omc/state/team/${teamName}/workers/${workerName}/shutdown-ack.json`,

  done: (teamName: string, workerName: string) =>
    `.omc/state/team/${teamName}/workers/${workerName}/done.json`,

  mailbox: (teamName: string, workerName: string) =>
    `.omc/state/team/${teamName}/mailbox/${workerName}.jsonl`,
} as const;

/**
 * Get absolute path for a team state file.
 */
export function absPath(cwd: string, relativePath: string): string {
  return join(cwd, relativePath);
}

/**
 * Get absolute root path for a team's state directory.
 */
export function teamStateRoot(cwd: string, teamName: string): string {
  return join(cwd, TeamPaths.root(teamName));
}
