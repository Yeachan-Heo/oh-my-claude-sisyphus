/**
 * Mode Registry - Centralized Mode State Detection
 *
 * CRITICAL: This module uses ONLY file-based detection.
 * It NEVER imports from mode modules to avoid circular dependencies.
 *
 * Mode modules import FROM this registry (unidirectional).
 *
 * All modes store state in `.omc/state/` subdirectory for consistency.
 */
import type { ExecutionMode, ModeConfig, ModeStatus, CanStartResult } from './types.js';
export type { ExecutionMode, ModeConfig, ModeStatus, CanStartResult } from './types.js';
/**
 * Stale marker threshold (1 hour)
 * Markers older than this are auto-removed to prevent crashed sessions from blocking indefinitely.
 * NOTE: We cannot check database activity here due to circular dependency constraints.
 * Legitimate long-running swarms (>1 hour) may have markers removed - acceptable trade-off.
 */
export declare const STALE_MARKER_THRESHOLD: number;
/**
 * Mode configuration registry
 *
 * Maps each mode to its state file location and detection method.
 * All paths are relative to .omc/state/ directory.
 */
declare const MODE_CONFIGS: Record<ExecutionMode, ModeConfig>;
export { MODE_CONFIGS };
/**
 * Get the state directory path
 */
export declare function getStateDir(cwd: string): string;
/**
 * Ensure the state directory exists
 */
export declare function ensureStateDir(cwd: string): void;
/**
 * Get the full path to a mode's state file
 */
export declare function getStateFilePath(cwd: string, mode: ExecutionMode): string;
/**
 * Get the full path to a mode's marker file
 */
export declare function getMarkerFilePath(cwd: string, mode: ExecutionMode): string | null;
/**
 * Get the global state file path (in ~/.claude/) for modes that support it
 * @deprecated Global state is no longer supported. All modes use local-only state in .omc/state/
 * @returns Always returns null
 */
export declare function getGlobalStateFilePath(mode: ExecutionMode): string | null;
/**
 * Check if a specific mode is currently active
 *
 * @param mode - The mode to check
 * @param cwd - Working directory
 * @returns true if the mode is active
 */
export declare function isModeActive(mode: ExecutionMode, cwd: string): boolean;
/**
 * Check if a mode has active state (file exists)
 */
export declare function hasModeState(cwd: string, mode: ExecutionMode): boolean;
/**
 * Get all modes that currently have state files
 */
export declare function getActiveModes(cwd: string): ExecutionMode[];
/**
 * Check if any OMC mode is currently active
 *
 * @param cwd - Working directory
 * @returns true if any mode is active
 */
export declare function isAnyModeActive(cwd: string): boolean;
/**
 * Get the currently active exclusive mode (if any)
 *
 * @param cwd - Working directory
 * @returns The active mode or null
 */
export declare function getActiveExclusiveMode(cwd: string): ExecutionMode | null;
/**
 * Check if a new mode can be started
 *
 * @param mode - The mode to start
 * @param cwd - Working directory
 * @returns CanStartResult with allowed status and blocker info
 */
export declare function canStartMode(mode: ExecutionMode, cwd: string): CanStartResult;
/**
 * Get status of all modes
 *
 * @param cwd - Working directory
 * @returns Array of mode statuses
 */
export declare function getAllModeStatuses(cwd: string): ModeStatus[];
/**
 * Clear all state files for a mode
 *
 * Deletes:
 * - Local state file (.omc/state/{mode}-state.json)
 * - Local marker file if applicable
 * - Global state file if applicable (~/.claude/{mode}-state.json)
 *
 * @returns true if all files were deleted successfully (or didn't exist)
 */
export declare function clearModeState(mode: ExecutionMode, cwd: string): boolean;
/**
 * Clear all mode states (force clear)
 */
export declare function clearAllModeStates(cwd: string): boolean;
/**
 * Create a marker file to indicate a mode is active
 *
 * Called when starting a SQLite-based mode (like swarm).
 *
 * @param mode - The mode being started
 * @param cwd - Working directory
 * @param metadata - Optional metadata to store in marker
 */
export declare function createModeMarker(mode: ExecutionMode, cwd: string, metadata?: Record<string, unknown>): boolean;
/**
 * Remove a marker file to indicate a mode has stopped
 *
 * Called when stopping a SQLite-based mode (like swarm).
 *
 * @param mode - The mode being stopped
 * @param cwd - Working directory
 */
export declare function removeModeMarker(mode: ExecutionMode, cwd: string): boolean;
/**
 * Read metadata from a marker file
 *
 * @param mode - The mode to read
 * @param cwd - Working directory
 */
export declare function readModeMarker(mode: ExecutionMode, cwd: string): Record<string, unknown> | null;
/**
 * Force remove a marker file regardless of staleness
 * Used for manual cleanup by users
 *
 * @param mode - The mode to clean up
 * @param cwd - Working directory
 */
export declare function forceRemoveMarker(mode: ExecutionMode, cwd: string): boolean;
//# sourceMappingURL=index.d.ts.map