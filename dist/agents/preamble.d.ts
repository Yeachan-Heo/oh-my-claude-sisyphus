/**
 * Worker Preamble Protocol
 *
 * Provides standardized preamble for delegating work to worker agents.
 * This prevents agents from spawning sub-agents and ensures they execute tasks directly.
 */
export declare const WORKER_PREAMBLE = "CONTEXT: You are a WORKER agent, not an orchestrator.\n\nRULES:\n- Complete ONLY the task described below\n- Use tools directly (Read, Write, Edit, Bash, etc.)\n- Do NOT spawn sub-agents\n- Do NOT call TaskCreate or TaskUpdate\n- Report your results with absolute file paths\n\nTASK:\n";
/**
 * Wraps a task description with the worker preamble
 * @param taskDescription The task to be completed by the worker agent
 * @returns The task description wrapped with worker preamble
 */
export declare function wrapWithPreamble(taskDescription: string): string;
//# sourceMappingURL=preamble.d.ts.map