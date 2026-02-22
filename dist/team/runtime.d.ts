import type { CliAgentType } from './model-contract.js';
export interface TeamConfig {
    teamName: string;
    workerCount: number;
    agentTypes: CliAgentType[];
    tasks: Array<{
        subject: string;
        description: string;
    }>;
    cwd: string;
}
export interface TeamRuntime {
    teamName: string;
    sessionName: string;
    config: TeamConfig;
    workerNames: string[];
    workerPaneIds: string[];
    cwd: string;
}
export interface WorkerStatus {
    workerName: string;
    alive: boolean;
    paneId: string;
    currentTaskId?: string;
    lastHeartbeat?: string;
    stalled: boolean;
}
export interface TeamSnapshot {
    teamName: string;
    phase: string;
    workers: WorkerStatus[];
    taskCounts: {
        pending: number;
        inProgress: number;
        completed: number;
        failed: number;
    };
    deadWorkers: string[];
}
/**
 * Start a new team: create tmux session, spawn workers, wait for ready.
 */
export declare function startTeam(config: TeamConfig): Promise<TeamRuntime>;
/**
 * Monitor team: poll worker health, detect stalls, return snapshot.
 */
export declare function monitorTeam(teamName: string, cwd: string, workerPaneIds: string[]): Promise<TeamSnapshot>;
/**
 * Assign a task to a specific worker via inbox + tmux trigger.
 */
export declare function assignTask(teamName: string, taskId: string, targetWorkerName: string, paneId: string, sessionName: string, cwd: string): Promise<void>;
/**
 * Gracefully shut down all workers and clean up.
 */
export declare function shutdownTeam(teamName: string, sessionName: string, cwd: string, timeoutMs?: number): Promise<void>;
/**
 * Resume an existing team from persisted state.
 */
export declare function resumeTeam(teamName: string, cwd: string): Promise<TeamRuntime | null>;
//# sourceMappingURL=runtime.d.ts.map