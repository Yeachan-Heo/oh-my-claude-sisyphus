/**
 * Autopilot Hook Module
 *
 * Main entry point for the /autopilot command - autonomous execution
 * from idea to working code.
 */

// Types
export type {
  AutopilotPhase,
  AutopilotState,
  AutopilotConfig,
  AutopilotResult,
  AutopilotSummary,
  AutopilotExpansion,
  AutopilotPlanning,
  AutopilotExecution,
  AutopilotQA,
  AutopilotValidation,
  ValidationResult,
  ValidationVerdictType,
  ValidationVerdict,
  QAStatus,
  AutopilotSignal
} from './types.js';

export { DEFAULT_CONFIG } from './types.js';

// State management
export {
  readAutopilotState,
  writeAutopilotState,
  clearAutopilotState,
  isAutopilotActive,
  initAutopilot,
  transitionPhase,
  incrementAgentCount,
  updateExpansion,
  updatePlanning,
  updateExecution,
  updateQA,
  updateValidation,
  ensureAutopilotDir,
  getSpecPath,
  getPlanPath
} from './state.js';

// Phase transitions
export {
  transitionRalphToUltraQA,
  transitionUltraQAToValidation,
  transitionToComplete,
  transitionToFailed,
  getTransitionPrompt,
  type TransitionResult
} from './transition.js';

// Prompt generation
export {
  getExpansionPrompt,
  getDirectPlanningPrompt,
  getExecutionPrompt,
  getQAPrompt,
  getValidationPrompt,
  getPhasePrompt
} from './prompts.js';

// Validation coordination
export {
  recordValidationVerdict,
  getValidationStatus,
  startValidationRound,
  shouldRetryValidation,
  getIssuesToFix,
  getValidationSpawnPrompt,
  formatValidationResults,
  type ValidationCoordinatorResult
} from './validation.js';

// Summary generation
export {
  generateSummary,
  formatSummary,
  formatCompactSummary,
  formatFailureSummary,
  formatFileList
} from './summary.js';

// Cancellation
export {
  cancelAutopilot,
  clearAutopilot,
  canResumeAutopilot,
  resumeAutopilot,
  formatCancelMessage,
  type CancelResult
} from './cancel.js';
