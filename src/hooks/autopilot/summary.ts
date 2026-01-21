/**
 * Autopilot Summary Generator
 *
 * Generates human-readable summaries when autopilot completes.
 */

import { readAutopilotState } from './state.js';
import type { AutopilotState, AutopilotSummary, AutopilotPhase } from './types.js';

/**
 * Generate a summary of the autopilot run
 */
export function generateSummary(directory: string): AutopilotSummary | null {
  const state = readAutopilotState(directory);
  if (!state) {
    return null;
  }

  const startTime = new Date(state.started_at).getTime();
  const endTime = state.completed_at
    ? new Date(state.completed_at).getTime()
    : Date.now();
  const duration = endTime - startTime;

  const phasesCompleted: AutopilotPhase[] = [];
  if (state.expansion.spec_path) phasesCompleted.push('expansion');
  if (state.planning.approved) phasesCompleted.push('planning');
  if (state.execution.ralph_completed_at) phasesCompleted.push('execution');
  if (state.qa.qa_completed_at) phasesCompleted.push('qa');
  if (state.validation.all_approved) phasesCompleted.push('validation');
  if (state.phase === 'complete') phasesCompleted.push('complete');

  let testsStatus = 'Not run';
  if (state.qa.test_status === 'passing') {
    testsStatus = 'Passing';
  } else if (state.qa.test_status === 'failing') {
    testsStatus = 'Failing';
  } else if (state.qa.test_status === 'skipped') {
    testsStatus = 'Skipped';
  }

  return {
    originalIdea: state.originalIdea,
    filesCreated: state.execution.files_created,
    filesModified: state.execution.files_modified,
    testsStatus,
    duration,
    agentsSpawned: state.total_agents_spawned,
    phasesCompleted
  };
}

/**
 * Format duration in human-readable format
 */
function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  return `${seconds}s`;
}

/**
 * Generate formatted summary output
 */
export function formatSummary(summary: AutopilotSummary): string {
  const lines: string[] = [
    '',
    '╭──────────────────────────────────────────────────────╮',
    '│                  AUTOPILOT COMPLETE                   │',
    '├──────────────────────────────────────────────────────┤'
  ];

  // Original idea (truncate if too long)
  const ideaDisplay = summary.originalIdea.length > 50
    ? summary.originalIdea.substring(0, 47) + '...'
    : summary.originalIdea;
  lines.push(`│  Original Idea: ${ideaDisplay.padEnd(36)} │`);
  lines.push('│                                                      │');

  // Delivered section
  lines.push('│  Delivered:                                          │');
  lines.push(`│  • ${summary.filesCreated.length} files created${' '.repeat(36 - String(summary.filesCreated.length).length)}│`);
  lines.push(`│  • ${summary.filesModified.length} files modified${' '.repeat(35 - String(summary.filesModified.length).length)}│`);
  lines.push(`│  • Tests: ${summary.testsStatus}${' '.repeat(36 - summary.testsStatus.length)}│`);
  lines.push('│                                                      │');

  // Metrics
  lines.push('│  Metrics:                                            │');
  const durationStr = formatDuration(summary.duration);
  lines.push(`│  • Duration: ${durationStr}${' '.repeat(35 - durationStr.length)}│`);
  lines.push(`│  • Agents spawned: ${summary.agentsSpawned}${' '.repeat(30 - String(summary.agentsSpawned).length)}│`);
  lines.push(`│  • Phases completed: ${summary.phasesCompleted.length}/5${' '.repeat(27)}│`);

  lines.push('╰──────────────────────────────────────────────────────╯');
  lines.push('');

  return lines.join('\n');
}

/**
 * Generate a compact summary for HUD display
 */
export function formatCompactSummary(state: AutopilotState): string {
  const phase = state.phase.toUpperCase();
  const files = state.execution.files_created.length + state.execution.files_modified.length;
  const agents = state.total_agents_spawned;

  if (state.phase === 'complete') {
    return `[AUTOPILOT ✓] Complete | ${files} files | ${agents} agents`;
  }

  if (state.phase === 'failed') {
    return `[AUTOPILOT ✗] Failed at ${state.phase}`;
  }

  const phaseIndex = ['expansion', 'planning', 'execution', 'qa', 'validation'].indexOf(state.phase);
  return `[AUTOPILOT] Phase ${phaseIndex + 1}/5: ${phase} | ${files} files`;
}

/**
 * Generate failure summary
 */
export function formatFailureSummary(state: AutopilotState, error?: string): string {
  const lines: string[] = [
    '',
    '╭──────────────────────────────────────────────────────╮',
    '│                  AUTOPILOT FAILED                     │',
    '├──────────────────────────────────────────────────────┤',
    `│  Failed at phase: ${state.phase.toUpperCase().padEnd(33)} │`
  ];

  if (error) {
    const errorLines = error.match(/.{1,48}/g) || [error];
    lines.push('│                                                      │');
    lines.push('│  Error:                                              │');
    for (const line of errorLines.slice(0, 3)) {
      lines.push(`│  ${line.padEnd(50)} │`);
    }
  }

  lines.push('│                                                      │');
  lines.push('│  Progress preserved. Run /autopilot to resume.       │');
  lines.push('╰──────────────────────────────────────────────────────╯');
  lines.push('');

  return lines.join('\n');
}

/**
 * List files for detailed summary
 */
export function formatFileList(files: string[], title: string, maxFiles: number = 10): string {
  if (files.length === 0) {
    return '';
  }

  const lines: string[] = [`\n### ${title} (${files.length})`];

  const displayFiles = files.slice(0, maxFiles);
  for (const file of displayFiles) {
    lines.push(`- ${file}`);
  }

  if (files.length > maxFiles) {
    lines.push(`- ... and ${files.length - maxFiles} more`);
  }

  return lines.join('\n');
}
