/**
 * Worktree Path Enforcement
 *
 * Provides strict path validation and resolution for .omc/ paths,
 * ensuring all operations stay within the worktree boundary.
 */
/** Standard .omc subdirectories */
export declare const OmcPaths: {
    readonly ROOT: ".omc";
    readonly STATE: ".omc/state";
    readonly PLANS: ".omc/plans";
    readonly RESEARCH: ".omc/research";
    readonly NOTEPAD: ".omc/notepad.md";
    readonly PROJECT_MEMORY: ".omc/project-memory.json";
    readonly DRAFTS: ".omc/drafts";
    readonly NOTEPADS: ".omc/notepads";
    readonly LOGS: ".omc/logs";
    readonly SCIENTIST: ".omc/scientist";
    readonly AUTOPILOT: ".omc/autopilot";
    readonly SKILLS: ".omc/skills";
};
/**
 * Get the git worktree root for the current or specified directory.
 * Returns null if not in a git repository.
 */
export declare function getWorktreeRoot(cwd?: string): string | null;
/**
 * Validate that a path is safe (no traversal attacks).
 *
 * @throws Error if path contains traversal sequences
 */
export declare function validatePath(inputPath: string): void;
/**
 * Resolve a relative path under .omc/ to an absolute path.
 * Validates the path is within the worktree boundary.
 *
 * @param relativePath - Path relative to .omc/ (e.g., "state/ralph.json")
 * @param worktreeRoot - Optional worktree root (auto-detected if not provided)
 * @returns Absolute path
 * @throws Error if path would escape worktree
 */
export declare function resolveOmcPath(relativePath: string, worktreeRoot?: string): string;
/**
 * Resolve a state file path.
 *
 * State files follow the naming convention: {mode}-state.json
 * Examples: ralph-state.json, ultrawork-state.json, autopilot-state.json
 *
 * Special case: swarm uses swarm.db (SQLite), not swarm-state.json.
 * This function is for JSON state files only. For swarm, use getStateFilePath from mode-registry.
 *
 * @param stateName - State name (e.g., "ralph", "ultrawork", or "ralph-state")
 * @param worktreeRoot - Optional worktree root
 * @returns Absolute path to state file
 */
export declare function resolveStatePath(stateName: string, worktreeRoot?: string): string;
/**
 * Ensure a directory exists under .omc/.
 * Creates parent directories as needed.
 *
 * @param relativePath - Path relative to .omc/
 * @param worktreeRoot - Optional worktree root
 * @returns Absolute path to the created directory
 */
export declare function ensureOmcDir(relativePath: string, worktreeRoot?: string): string;
/**
 * Get the absolute path to the notepad file.
 * NOTE: Named differently from hooks/notepad/getNotepadPath which takes `directory` (required).
 * This version auto-detects worktree root.
 */
export declare function getWorktreeNotepadPath(worktreeRoot?: string): string;
/**
 * Get the absolute path to the project memory file.
 */
export declare function getWorktreeProjectMemoryPath(worktreeRoot?: string): string;
/**
 * Get the .omc root directory path.
 */
export declare function getOmcRoot(worktreeRoot?: string): string;
/**
 * Resolve a plan file path.
 * @param planName - Plan name (without .md extension)
 */
export declare function resolvePlanPath(planName: string, worktreeRoot?: string): string;
/**
 * Resolve a research directory path.
 * @param name - Research folder name
 */
export declare function resolveResearchPath(name: string, worktreeRoot?: string): string;
/**
 * Resolve the logs directory path.
 */
export declare function resolveLogsPath(worktreeRoot?: string): string;
/**
 * Resolve a wisdom/plan-scoped notepad directory path.
 * @param planName - Plan name for the scoped notepad
 */
export declare function resolveWisdomPath(planName: string, worktreeRoot?: string): string;
/**
 * Check if an absolute path is under the .omc directory.
 * @param absolutePath - Absolute path to check
 */
export declare function isPathUnderOmc(absolutePath: string, worktreeRoot?: string): boolean;
/**
 * Ensure all standard .omc subdirectories exist.
 */
export declare function ensureAllOmcDirs(worktreeRoot?: string): void;
/**
 * Clear the worktree cache (useful for testing).
 */
export declare function clearWorktreeCache(): void;
/**
 * Validate that a workingDirectory is within the trusted worktree root.
 * The trusted root is derived from process.cwd(), NOT from user input.
 *
 * @param workingDirectory - User-supplied working directory
 * @returns The validated worktree root
 * @throws Error if workingDirectory is outside trusted root
 */
export declare function validateWorkingDirectory(workingDirectory?: string): string;
//# sourceMappingURL=worktree-paths.d.ts.map