/**
 * Autopilot State Management & Phase Transitions
 *
 * Handles:
 * - Persistent state for the autopilot workflow across phases
 * - Phase transitions, especially Ralph → UltraQA and UltraQA → Validation
 * - State machine operations
 */
import type { AutopilotState, AutopilotPhase, AutopilotConfig } from './types.js';
/**
 * Ensure the autopilot directory exists
 */
export declare function ensureAutopilotDir(directory: string): string;
/**
 * Read autopilot state from disk
 */
export declare function readAutopilotState(directory: string): AutopilotState | null;
/**
 * Write autopilot state to disk
 */
export declare function writeAutopilotState(directory: string, state: AutopilotState): boolean;
/**
 * Clear autopilot state
 */
export declare function clearAutopilotState(directory: string): boolean;
/**
 * Check if autopilot is active
 */
export declare function isAutopilotActive(directory: string): boolean;
/**
 * Initialize a new autopilot session
 */
export declare function initAutopilot(directory: string, idea: string, sessionId?: string, config?: Partial<AutopilotConfig>): AutopilotState | null;
/**
 * Transition to a new phase
 */
export declare function transitionPhase(directory: string, newPhase: AutopilotPhase): AutopilotState | null;
/**
 * Increment the agent spawn counter
 */
export declare function incrementAgentCount(directory: string, count?: number): boolean;
/**
 * Update expansion phase data
 */
export declare function updateExpansion(directory: string, updates: Partial<AutopilotState['expansion']>): boolean;
/**
 * Update planning phase data
 */
export declare function updatePlanning(directory: string, updates: Partial<AutopilotState['planning']>): boolean;
/**
 * Update execution phase data
 */
export declare function updateExecution(directory: string, updates: Partial<AutopilotState['execution']>): boolean;
/**
 * Update QA phase data
 */
export declare function updateQA(directory: string, updates: Partial<AutopilotState['qa']>): boolean;
/**
 * Update validation phase data
 */
export declare function updateValidation(directory: string, updates: Partial<AutopilotState['validation']>): boolean;
/**
 * Get the spec file path
 */
export declare function getSpecPath(directory: string): string;
/**
 * Get the plan file path
 */
export declare function getPlanPath(directory: string): string;
export interface TransitionResult {
    success: boolean;
    error?: string;
    state?: AutopilotState;
}
/**
 * Transition from Ralph (Phase 2: Execution) to UltraQA (Phase 3: QA)
 *
 * This handles the mutual exclusion by:
 * 1. Saving Ralph's progress to autopilot state
 * 2. Cleanly terminating Ralph mode (and linked Ultrawork)
 * 3. Starting UltraQA mode
 * 4. Preserving context for potential rollback
 */
export declare function transitionRalphToUltraQA(directory: string, sessionId: string): TransitionResult;
/**
 * Transition from UltraQA (Phase 3: QA) to Validation (Phase 4)
 */
export declare function transitionUltraQAToValidation(directory: string): TransitionResult;
/**
 * Transition from Validation (Phase 4) to Complete
 */
export declare function transitionToComplete(directory: string): TransitionResult;
/**
 * Transition to failed state
 */
export declare function transitionToFailed(directory: string, error: string): TransitionResult;
/**
 * Get a prompt for Claude to execute the transition
 */
export declare function getTransitionPrompt(fromPhase: string, toPhase: string): string;
//# sourceMappingURL=state.d.ts.map