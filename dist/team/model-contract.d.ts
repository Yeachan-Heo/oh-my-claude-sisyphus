export type CliAgentType = 'claude' | 'codex' | 'gemini';
export interface CliAgentContract {
    agentType: CliAgentType;
    binary: string;
    installInstructions: string;
    buildLaunchArgs(model?: string, extraFlags?: string[]): string[];
    parseOutput(rawOutput: string): string;
}
export interface WorkerLaunchConfig {
    teamName: string;
    workerName: string;
    model?: string;
    cwd: string;
    extraFlags?: string[];
}
export declare function getContract(agentType: CliAgentType): CliAgentContract;
export declare function isCliAvailable(agentType: CliAgentType): boolean;
export declare function validateCliAvailable(agentType: CliAgentType): void;
export declare function buildLaunchArgs(agentType: CliAgentType, config: WorkerLaunchConfig): string[];
export declare function buildWorkerCommand(agentType: CliAgentType, config: WorkerLaunchConfig): string;
export declare function getWorkerEnv(teamName: string, workerName: string, agentType: CliAgentType): Record<string, string>;
export declare function parseCliOutput(agentType: CliAgentType, rawOutput: string): string;
//# sourceMappingURL=model-contract.d.ts.map