/**
 * Ralph Hook
 *
 * Self-referential work loop that continues until cancelled via /oh-my-claudecode:cancel.
 * Named after the character who keeps working until the job is done.
 *
 * Enhanced with PRD (Product Requirements Document) support for structured task tracking.
 * When a prd.json exists, completion is based on all stories having passes: true.
 *
 * Ported from oh-my-opencode's ralph hook.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync, } from "fs";
import { join } from "path";
import { readPrd, getPrdStatus, formatNextStoryPrompt, formatPrdStatus, } from "./prd.js";
import { getProgressContext, appendProgress, initProgress, addPattern, } from "./progress.js";
import { readUltraworkState as readUltraworkStateFromModule, writeUltraworkState as writeUltraworkStateFromModule, } from "../ultrawork/index.js";
// Forward declaration to avoid circular import - check ultraqa state file directly
export function isUltraQAActive(directory) {
    const omcDir = join(directory, ".omc");
    const stateFile = join(omcDir, "state", "ultraqa-state.json");
    if (!existsSync(stateFile)) {
        return false;
    }
    try {
        const content = readFileSync(stateFile, "utf-8");
        const state = JSON.parse(content);
        return state && state.active === true;
    }
    catch {
        return false;
    }
}
const DEFAULT_MAX_ITERATIONS = 10;
/**
 * Get the state file path for Ralph Loop
 */
function getStateFilePath(directory) {
    const omcDir = join(directory, ".omc");
    return join(omcDir, "state", "ralph-state.json");
}
/**
 * Ensure the .omc directory exists
 */
function ensureStateDir(directory) {
    const stateDir = join(directory, ".omc", "state");
    if (!existsSync(stateDir)) {
        mkdirSync(stateDir, { recursive: true });
    }
}
/**
 * Read Ralph Loop state from disk
 */
export function readRalphState(directory) {
    const stateFile = getStateFilePath(directory);
    if (!existsSync(stateFile)) {
        return null;
    }
    try {
        const content = readFileSync(stateFile, "utf-8");
        return JSON.parse(content);
    }
    catch (error) {
        console.error("[ralph] Failed to read state file:", error);
        return null;
    }
}
/**
 * Write Ralph Loop state to disk
 */
export function writeRalphState(directory, state) {
    try {
        ensureStateDir(directory);
        const stateFile = getStateFilePath(directory);
        writeFileSync(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Clear Ralph Loop state
 */
export function clearRalphState(directory) {
    const stateFile = getStateFilePath(directory);
    if (!existsSync(stateFile)) {
        return true;
    }
    try {
        unlinkSync(stateFile);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Clear ultrawork state (only if linked to ralph)
 */
export function clearLinkedUltraworkState(directory) {
    const state = readUltraworkStateFromModule(directory);
    // Only clear if it was linked to ralph (auto-activated)
    if (!state || !state.linked_to_ralph) {
        return true;
    }
    const omcDir = join(directory, ".omc");
    const stateFile = join(omcDir, "state", "ultrawork-state.json");
    try {
        unlinkSync(stateFile);
        return true;
    }
    catch {
        return false;
    }
}
/**
 * Increment Ralph Loop iteration
 */
export function incrementRalphIteration(directory) {
    const state = readRalphState(directory);
    if (!state || !state.active) {
        return null;
    }
    state.iteration += 1;
    if (writeRalphState(directory, state)) {
        return state;
    }
    return null;
}
/**
 * Create a Ralph Loop hook instance
 */
export function createRalphLoopHook(directory) {
    const startLoop = (sessionId, prompt, options) => {
        // Mutual exclusion check: cannot start Ralph Loop if UltraQA is active
        if (isUltraQAActive(directory)) {
            console.error("Cannot start Ralph Loop while UltraQA is active. Cancel UltraQA first with /oh-my-claudecode:cancel.");
            return false;
        }
        const enableUltrawork = !options?.disableUltrawork;
        const now = new Date().toISOString();
        const state = {
            active: true,
            iteration: 1,
            max_iterations: options?.maxIterations ?? DEFAULT_MAX_ITERATIONS,
            started_at: now,
            prompt,
            session_id: sessionId,
            project_path: directory,
            linked_ultrawork: enableUltrawork,
        };
        const ralphSuccess = writeRalphState(directory, state);
        // Auto-activate ultrawork (linked to ralph) by default
        // Include session_id and project_path for proper isolation
        if (ralphSuccess && enableUltrawork) {
            const ultraworkState = {
                active: true,
                reinforcement_count: 0,
                original_prompt: prompt,
                started_at: now,
                last_checked_at: now,
                linked_to_ralph: true,
                session_id: sessionId,
                project_path: directory,
            };
            writeUltraworkStateFromModule(ultraworkState, directory);
        }
        return ralphSuccess;
    };
    const cancelLoop = (sessionId) => {
        const state = readRalphState(directory);
        if (!state || state.session_id !== sessionId) {
            return false;
        }
        // Also clear linked ultrawork state if it was auto-activated
        if (state.linked_ultrawork) {
            clearLinkedUltraworkState(directory);
        }
        return clearRalphState(directory);
    };
    const getState = () => {
        return readRalphState(directory);
    };
    return {
        startLoop,
        cancelLoop,
        getState,
    };
}
// ============================================================================
// PRD Integration
// ============================================================================
/**
 * Check if PRD mode is available (prd.json exists)
 */
export function hasPrd(directory) {
    const prd = readPrd(directory);
    return prd !== null;
}
/**
 * Get PRD completion status for ralph
 */
export function getPrdCompletionStatus(directory) {
    const prd = readPrd(directory);
    if (!prd) {
        return {
            hasPrd: false,
            allComplete: false,
            status: null,
            nextStory: null,
        };
    }
    const status = getPrdStatus(prd);
    return {
        hasPrd: true,
        allComplete: status.allComplete,
        status,
        nextStory: status.nextStory,
    };
}
/**
 * Get context injection for ralph continuation
 * Includes PRD current story and progress memory
 */
export function getRalphContext(directory) {
    const parts = [];
    // Add progress context (patterns, learnings)
    const progressContext = getProgressContext(directory);
    if (progressContext) {
        parts.push(progressContext);
    }
    // Add current story from PRD
    const prdStatus = getPrdCompletionStatus(directory);
    if (prdStatus.hasPrd && prdStatus.nextStory) {
        parts.push(formatNextStoryPrompt(prdStatus.nextStory));
    }
    // Add PRD status summary
    if (prdStatus.status) {
        parts.push(`<prd-status>\n${formatPrdStatus(prdStatus.status)}\n</prd-status>\n`);
    }
    return parts.join("\n");
}
/**
 * Update ralph state with current story
 */
export function setCurrentStory(directory, storyId) {
    const state = readRalphState(directory);
    if (!state) {
        return false;
    }
    state.current_story_id = storyId;
    return writeRalphState(directory, state);
}
/**
 * Enable PRD mode in ralph state
 */
export function enablePrdMode(directory) {
    const state = readRalphState(directory);
    if (!state) {
        return false;
    }
    state.prd_mode = true;
    // Initialize progress.txt if it doesn't exist
    initProgress(directory);
    return writeRalphState(directory, state);
}
/**
 * Record progress after completing a story
 */
export function recordStoryProgress(directory, storyId, implementation, filesChanged, learnings) {
    return appendProgress(directory, {
        storyId,
        implementation,
        filesChanged,
        learnings,
    });
}
/**
 * Add a codebase pattern discovered during work
 */
export function recordPattern(directory, pattern) {
    return addPattern(directory, pattern);
}
/**
 * Check if ralph should complete based on PRD status
 */
export function shouldCompleteByPrd(directory) {
    const status = getPrdCompletionStatus(directory);
    return status.hasPrd && status.allComplete;
}
//# sourceMappingURL=loop.js.map