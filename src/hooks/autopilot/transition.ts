/**
 * Autopilot Phase Transitions
 *
 * Handles transitions between phases, especially the critical Ralph → UltraQA
 * and UltraQA → Validation transitions that must respect mutual exclusion.
 */

import {
  readRalphState,
  clearRalphState,
  clearLinkedUltraworkState
} from '../ralph-loop/index.js';
import {
  startUltraQA,
  clearUltraQAState,
  readUltraQAState
} from '../ultraqa-loop/index.js';
import {
  readAutopilotState,
  writeAutopilotState,
  transitionPhase,
  updateExecution,
  updateQA,
  updateValidation
} from './state.js';
import type { AutopilotState } from './types.js';

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
export function transitionRalphToUltraQA(
  directory: string,
  sessionId: string
): TransitionResult {
  const autopilotState = readAutopilotState(directory);

  if (!autopilotState || autopilotState.phase !== 'execution') {
    return {
      success: false,
      error: 'Not in execution phase - cannot transition to QA'
    };
  }

  const ralphState = readRalphState(directory);

  // Step 1: Preserve Ralph progress in autopilot state
  const executionUpdated = updateExecution(directory, {
    ralph_iterations: ralphState?.iteration ?? autopilotState.execution.ralph_iterations,
    ralph_completed_at: new Date().toISOString(),
    ultrawork_active: false
  });

  if (!executionUpdated) {
    return {
      success: false,
      error: 'Failed to update execution state'
    };
  }

  // Step 2: Cleanly terminate Ralph (and linked Ultrawork)
  if (ralphState?.linked_ultrawork) {
    clearLinkedUltraworkState(directory);
  }
  const ralphCleared = clearRalphState(directory);

  if (!ralphCleared) {
    return {
      success: false,
      error: 'Failed to clear Ralph state'
    };
  }

  // Step 3: Transition to QA phase
  const newState = transitionPhase(directory, 'qa');
  if (!newState) {
    return {
      success: false,
      error: 'Failed to transition to QA phase'
    };
  }

  // Step 4: Start UltraQA
  const qaResult = startUltraQA(directory, 'tests', sessionId, { maxCycles: 5 });

  if (!qaResult.success) {
    // Rollback on failure - restore execution phase
    transitionPhase(directory, 'execution');
    updateExecution(directory, { ralph_completed_at: undefined });

    return {
      success: false,
      error: qaResult.error || 'Failed to start UltraQA'
    };
  }

  return {
    success: true,
    state: newState
  };
}

/**
 * Transition from UltraQA (Phase 3: QA) to Validation (Phase 4)
 */
export function transitionUltraQAToValidation(
  directory: string
): TransitionResult {
  const autopilotState = readAutopilotState(directory);

  if (!autopilotState || autopilotState.phase !== 'qa') {
    return {
      success: false,
      error: 'Not in QA phase - cannot transition to validation'
    };
  }

  const qaState = readUltraQAState(directory);

  // Preserve QA progress
  const qaUpdated = updateQA(directory, {
    ultraqa_cycles: qaState?.cycle ?? autopilotState.qa.ultraqa_cycles,
    qa_completed_at: new Date().toISOString()
  });

  if (!qaUpdated) {
    return {
      success: false,
      error: 'Failed to update QA state'
    };
  }

  // Terminate UltraQA
  clearUltraQAState(directory);

  // Transition to validation
  const newState = transitionPhase(directory, 'validation');
  if (!newState) {
    return {
      success: false,
      error: 'Failed to transition to validation phase'
    };
  }

  return {
    success: true,
    state: newState
  };
}

/**
 * Transition from Validation (Phase 4) to Complete
 */
export function transitionToComplete(directory: string): TransitionResult {
  const state = transitionPhase(directory, 'complete');

  if (!state) {
    return {
      success: false,
      error: 'Failed to transition to complete phase'
    };
  }

  return { success: true, state };
}

/**
 * Transition to failed state
 */
export function transitionToFailed(
  directory: string,
  error: string
): TransitionResult {
  const state = transitionPhase(directory, 'failed');

  if (!state) {
    return {
      success: false,
      error: 'Failed to transition to failed phase'
    };
  }

  return { success: true, state };
}

/**
 * Get a prompt for Claude to execute the transition
 */
export function getTransitionPrompt(
  fromPhase: string,
  toPhase: string
): string {
  if (fromPhase === 'execution' && toPhase === 'qa') {
    return `## PHASE TRANSITION: Execution → QA

The execution phase is complete. Transitioning to QA phase.

**CRITICAL**: Ralph mode must be cleanly terminated before UltraQA can start.

The transition handler has:
1. Preserved Ralph iteration count and progress
2. Cleared Ralph state (and linked Ultrawork)
3. Started UltraQA in 'tests' mode

You are now in QA phase. Run the QA cycle:
1. Build: npm run build (or equivalent)
2. Lint: npm run lint (or equivalent)
3. Test: npm test (or equivalent)

Fix any failures and repeat until all pass.

Signal when QA passes: QA_COMPLETE
`;
  }

  if (fromPhase === 'qa' && toPhase === 'validation') {
    return `## PHASE TRANSITION: QA → Validation

All QA checks have passed. Transitioning to validation phase.

The transition handler has:
1. Preserved UltraQA cycle count
2. Cleared UltraQA state
3. Updated phase to 'validation'

You are now in validation phase. Spawn parallel validation architects:

\`\`\`
// Spawn all three in parallel
Task(subagent_type="oh-my-claudecode:architect", model="opus",
  prompt="FUNCTIONAL COMPLETENESS REVIEW: Verify all requirements from spec are implemented")

Task(subagent_type="oh-my-claudecode:security-reviewer", model="opus",
  prompt="SECURITY REVIEW: Check for vulnerabilities, injection risks, auth issues")

Task(subagent_type="oh-my-claudecode:code-reviewer", model="opus",
  prompt="CODE QUALITY REVIEW: Check patterns, maintainability, test coverage")
\`\`\`

Aggregate verdicts:
- All APPROVED → Signal: AUTOPILOT_COMPLETE
- Any REJECTED → Fix issues and re-validate (max 3 rounds)
`;
  }

  if (fromPhase === 'expansion' && toPhase === 'planning') {
    return `## PHASE TRANSITION: Expansion → Planning

The idea has been expanded into a detailed specification.

Read the spec and create an implementation plan using the Architect agent (direct planning mode).

Signal when Critic approves the plan: PLANNING_COMPLETE
`;
  }

  if (fromPhase === 'planning' && toPhase === 'execution') {
    return `## PHASE TRANSITION: Planning → Execution

The plan has been approved. Starting execution phase with Ralph + Ultrawork.

Execute tasks from the plan in parallel where possible.

Signal when all tasks complete: EXECUTION_COMPLETE
`;
  }

  return '';
}
