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
export declare const TeamPaths: {
    readonly root: (teamName: string) => string;
    readonly config: (teamName: string) => string;
    readonly shutdown: (teamName: string) => string;
    readonly tasks: (teamName: string) => string;
    readonly taskFile: (teamName: string, taskId: string) => string;
    readonly workers: (teamName: string) => string;
    readonly workerDir: (teamName: string, workerName: string) => string;
    readonly heartbeat: (teamName: string, workerName: string) => string;
    readonly inbox: (teamName: string, workerName: string) => string;
    readonly outbox: (teamName: string, workerName: string) => string;
    readonly ready: (teamName: string, workerName: string) => string;
    readonly overlay: (teamName: string, workerName: string) => string;
    readonly shutdownAck: (teamName: string, workerName: string) => string;
    readonly done: (teamName: string, workerName: string) => string;
    readonly mailbox: (teamName: string, workerName: string) => string;
};
/**
 * Get absolute path for a team state file.
 */
export declare function absPath(cwd: string, relativePath: string): string;
/**
 * Get absolute root path for a team's state directory.
 */
export declare function teamStateRoot(cwd: string, teamName: string): string;
//# sourceMappingURL=state-paths.d.ts.map