/**
 * State Manager
 *
 * Unified state management that standardizes state file locations:
 * - Local state: .omc/state/{name}.json
 * - Global state: ~/.omc/state/{name}.json
 *
 * Features:
 * - Type-safe read/write operations
 * - Auto-create directories
 * - Legacy location support (for migration)
 * - State cleanup utilities
 */
import { StateLocation, StateConfig, StateReadResult, StateWriteResult, StateClearResult, StateMigrationResult, StateFileInfo, ListStatesOptions, CleanupOptions, CleanupResult, StateData } from "./types.js";
/**
 * Get the standard path for a state file
 */
export declare function getStatePath(name: string, location: StateLocation): string;
/**
 * Get legacy paths for a state file (for migration)
 */
export declare function getLegacyPaths(name: string): string[];
/**
 * Ensure state directory exists
 */
export declare function ensureStateDir(location: StateLocation): void;
/**
 * Read state from file
 *
 * Checks standard location first, then legacy locations if enabled.
 * Returns both the data and where it was found.
 */
export declare function readState<T = StateData>(name: string, location?: StateLocation, options?: {
    checkLegacy?: boolean;
}): StateReadResult<T>;
/**
 * Write state to file
 *
 * Always writes to the standard location.
 * Creates directories if they don't exist.
 */
export declare function writeState<T = StateData>(name: string, data: T, location?: StateLocation, options?: {
    createDirs?: boolean;
}): StateWriteResult;
/**
 * Clear state from all locations (standard + legacy)
 *
 * Removes the state file from both standard and legacy locations.
 * Returns information about what was removed.
 */
export declare function clearState(name: string, location?: StateLocation): StateClearResult;
/**
 * Migrate state from legacy location to standard location
 *
 * Finds state in legacy locations and moves it to the standard location.
 * Deletes the legacy file after successful migration.
 */
export declare function migrateState(name: string, location?: StateLocation): StateMigrationResult;
/**
 * List all state files
 *
 * Returns information about all state files in the specified location(s).
 */
export declare function listStates(options?: ListStatesOptions): StateFileInfo[];
/**
 * Cleanup orphaned state files
 *
 * Removes state files that haven't been modified in a long time.
 * Useful for cleaning up abandoned states.
 */
export declare function cleanupOrphanedStates(options?: CleanupOptions): CleanupResult;
/**
 * State Manager Class
 *
 * Object-oriented interface for managing a specific state.
 */
export declare class StateManager<T = StateData> {
    private name;
    private location;
    constructor(name: string, location?: StateLocation);
    read(options?: {
        checkLegacy?: boolean;
    }): StateReadResult<T>;
    write(data: T, options?: {
        createDirs?: boolean;
    }): StateWriteResult;
    clear(): StateClearResult;
    migrate(): StateMigrationResult;
    exists(): boolean;
    get(): T | undefined;
    set(data: T): boolean;
    update(updater: (current: T | undefined) => T): boolean;
}
/**
 * Create a state manager for a specific state
 */
export declare function createStateManager<T = StateData>(name: string, location?: StateLocation): StateManager<T>;
export type { StateConfig, StateReadResult, StateWriteResult, StateClearResult, StateMigrationResult, StateFileInfo, ListStatesOptions, CleanupOptions, CleanupResult, StateData, };
export { StateLocation, DEFAULT_STATE_CONFIG, isStateLocation, } from "./types.js";
//# sourceMappingURL=index.d.ts.map