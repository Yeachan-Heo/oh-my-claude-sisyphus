/**
 * Autopilot State Management
 *
 * Persistent state for the autopilot workflow across phases.
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import type { AutopilotState, AutopilotPhase, AutopilotConfig } from './types.js';
import { DEFAULT_CONFIG } from './types.js';

const STATE_FILE = 'autopilot-state.json';
const SPEC_DIR = 'autopilot';

/**
 * Get the state file path
 */
function getStateFilePath(directory: string): string {
  const omcDir = join(directory, '.omc');
  return join(omcDir, STATE_FILE);
}

/**
 * Ensure the .omc directory exists
 */
function ensureOmcDir(directory: string): void {
  const omcDir = join(directory, '.omc');
  if (!existsSync(omcDir)) {
    mkdirSync(omcDir, { recursive: true });
  }
}

/**
 * Ensure the autopilot directory exists
 */
export function ensureAutopilotDir(directory: string): string {
  ensureOmcDir(directory);
  const autopilotDir = join(directory, '.omc', SPEC_DIR);
  if (!existsSync(autopilotDir)) {
    mkdirSync(autopilotDir, { recursive: true });
  }
  return autopilotDir;
}

/**
 * Read autopilot state from disk
 */
export function readAutopilotState(directory: string): AutopilotState | null {
  const stateFile = getStateFilePath(directory);

  if (!existsSync(stateFile)) {
    return null;
  }

  try {
    const content = readFileSync(stateFile, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Write autopilot state to disk
 */
export function writeAutopilotState(directory: string, state: AutopilotState): boolean {
  try {
    ensureOmcDir(directory);
    const stateFile = getStateFilePath(directory);
    writeFileSync(stateFile, JSON.stringify(state, null, 2));
    return true;
  } catch {
    return false;
  }
}

/**
 * Clear autopilot state
 */
export function clearAutopilotState(directory: string): boolean {
  const stateFile = getStateFilePath(directory);

  if (!existsSync(stateFile)) {
    return true;
  }

  try {
    unlinkSync(stateFile);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if autopilot is active
 */
export function isAutopilotActive(directory: string): boolean {
  const state = readAutopilotState(directory);
  return state !== null && state.active === true;
}

/**
 * Initialize a new autopilot session
 */
export function initAutopilot(
  directory: string,
  idea: string,
  sessionId?: string,
  config?: Partial<AutopilotConfig>
): AutopilotState {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const now = new Date().toISOString();

  const state: AutopilotState = {
    active: true,
    phase: 'expansion',
    iteration: 1,
    max_iterations: mergedConfig.maxIterations ?? 10,
    originalIdea: idea,

    expansion: {
      analyst_complete: false,
      architect_complete: false,
      spec_path: null,
      requirements_summary: '',
      tech_stack: []
    },

    planning: {
      plan_path: null,
      architect_iterations: 0,
      approved: false
    },

    execution: {
      ralph_iterations: 0,
      ultrawork_active: false,
      tasks_completed: 0,
      tasks_total: 0,
      files_created: [],
      files_modified: []
    },

    qa: {
      ultraqa_cycles: 0,
      build_status: 'pending',
      lint_status: 'pending',
      test_status: 'pending'
    },

    validation: {
      architects_spawned: 0,
      verdicts: [],
      all_approved: false,
      validation_rounds: 0
    },

    started_at: now,
    completed_at: null,
    phase_durations: {},
    total_agents_spawned: 0,
    wisdom_entries: 0,
    session_id: sessionId
  };

  ensureAutopilotDir(directory);
  writeAutopilotState(directory, state);

  return state;
}

/**
 * Transition to a new phase
 */
export function transitionPhase(
  directory: string,
  newPhase: AutopilotPhase
): AutopilotState | null {
  const state = readAutopilotState(directory);

  if (!state || !state.active) {
    return null;
  }

  const now = new Date().toISOString();
  const oldPhase = state.phase;

  // Record duration for old phase (if we have a start time recorded)
  const phaseStartKey = `${oldPhase}_start_ms`;
  if (state.phase_durations[phaseStartKey] !== undefined) {
    const duration = Date.now() - state.phase_durations[phaseStartKey];
    state.phase_durations[oldPhase] = duration;
  }

  // Transition to new phase and record start time
  state.phase = newPhase;
  state.phase_durations[`${newPhase}_start_ms`] = Date.now();

  if (newPhase === 'complete' || newPhase === 'failed') {
    state.completed_at = now;
    state.active = false;
  }

  writeAutopilotState(directory, state);
  return state;
}

/**
 * Increment the agent spawn counter
 */
export function incrementAgentCount(directory: string, count: number = 1): boolean {
  const state = readAutopilotState(directory);
  if (!state) return false;

  state.total_agents_spawned += count;
  return writeAutopilotState(directory, state);
}

/**
 * Update expansion phase data
 */
export function updateExpansion(
  directory: string,
  updates: Partial<AutopilotState['expansion']>
): boolean {
  const state = readAutopilotState(directory);
  if (!state) return false;

  state.expansion = { ...state.expansion, ...updates };
  return writeAutopilotState(directory, state);
}

/**
 * Update planning phase data
 */
export function updatePlanning(
  directory: string,
  updates: Partial<AutopilotState['planning']>
): boolean {
  const state = readAutopilotState(directory);
  if (!state) return false;

  state.planning = { ...state.planning, ...updates };
  return writeAutopilotState(directory, state);
}

/**
 * Update execution phase data
 */
export function updateExecution(
  directory: string,
  updates: Partial<AutopilotState['execution']>
): boolean {
  const state = readAutopilotState(directory);
  if (!state) return false;

  state.execution = { ...state.execution, ...updates };
  return writeAutopilotState(directory, state);
}

/**
 * Update QA phase data
 */
export function updateQA(
  directory: string,
  updates: Partial<AutopilotState['qa']>
): boolean {
  const state = readAutopilotState(directory);
  if (!state) return false;

  state.qa = { ...state.qa, ...updates };
  return writeAutopilotState(directory, state);
}

/**
 * Update validation phase data
 */
export function updateValidation(
  directory: string,
  updates: Partial<AutopilotState['validation']>
): boolean {
  const state = readAutopilotState(directory);
  if (!state) return false;

  state.validation = { ...state.validation, ...updates };
  return writeAutopilotState(directory, state);
}

/**
 * Get the spec file path
 */
export function getSpecPath(directory: string): string {
  return join(directory, '.omc', SPEC_DIR, 'spec.md');
}

/**
 * Get the plan file path
 */
export function getPlanPath(directory: string): string {
  return join(directory, '.omc', 'plans', 'autopilot-impl.md');
}
