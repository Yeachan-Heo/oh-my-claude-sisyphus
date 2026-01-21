/**
 * Autopilot Validation Coordinator
 *
 * Coordinates parallel validation architects for Phase 4.
 * Aggregates verdicts and determines if autopilot can complete.
 */

import {
  readAutopilotState,
  writeAutopilotState,
  updateValidation
} from './state.js';
import type {
  AutopilotState,
  ValidationResult,
  ValidationVerdictType,
  ValidationVerdict
} from './types.js';

export interface ValidationCoordinatorResult {
  success: boolean;
  allApproved: boolean;
  verdicts: ValidationResult[];
  round: number;
  issues: string[];
}

/**
 * Record a validation verdict from an architect
 */
export function recordValidationVerdict(
  directory: string,
  type: ValidationVerdictType,
  verdict: ValidationVerdict,
  issues?: string[]
): boolean {
  const state = readAutopilotState(directory);
  if (!state || state.phase !== 'validation') {
    return false;
  }

  const result: ValidationResult = {
    type,
    verdict,
    issues
  };

  // Remove any existing verdict of this type for the current round
  const existingIndex = state.validation.verdicts.findIndex(
    v => v.type === type
  );

  if (existingIndex >= 0) {
    state.validation.verdicts[existingIndex] = result;
  } else {
    state.validation.verdicts.push(result);
    state.validation.architects_spawned++;
  }

  // Check if all verdicts are in (3 architects)
  if (state.validation.verdicts.length >= 3) {
    state.validation.all_approved = state.validation.verdicts.every(
      v => v.verdict === 'APPROVED'
    );
  }

  return writeAutopilotState(directory, state);
}

/**
 * Get validation status
 */
export function getValidationStatus(directory: string): ValidationCoordinatorResult | null {
  const state = readAutopilotState(directory);
  if (!state) {
    return null;
  }

  const allIssues: string[] = [];
  for (const verdict of state.validation.verdicts) {
    if (verdict.issues) {
      allIssues.push(...verdict.issues);
    }
  }

  return {
    success: state.validation.verdicts.length >= 3,
    allApproved: state.validation.all_approved,
    verdicts: state.validation.verdicts,
    round: state.validation.validation_rounds,
    issues: allIssues
  };
}

/**
 * Start a new validation round
 */
export function startValidationRound(directory: string): boolean {
  const state = readAutopilotState(directory);
  if (!state || state.phase !== 'validation') {
    return false;
  }

  state.validation.validation_rounds++;
  state.validation.verdicts = [];
  state.validation.all_approved = false;
  state.validation.architects_spawned = 0;

  return writeAutopilotState(directory, state);
}

/**
 * Check if validation should retry
 */
export function shouldRetryValidation(directory: string, maxRounds: number = 3): boolean {
  const state = readAutopilotState(directory);
  if (!state) {
    return false;
  }

  const hasRejection = state.validation.verdicts.some(
    v => v.verdict === 'REJECTED'
  );

  const canRetry = state.validation.validation_rounds < maxRounds;

  return hasRejection && canRetry;
}

/**
 * Get issues that need fixing before retry
 */
export function getIssuesToFix(directory: string): string[] {
  const state = readAutopilotState(directory);
  if (!state) {
    return [];
  }

  const issues: string[] = [];

  for (const verdict of state.validation.verdicts) {
    if (verdict.verdict === 'REJECTED' && verdict.issues) {
      issues.push(`[${verdict.type.toUpperCase()}] ${verdict.issues.join(', ')}`);
    }
  }

  return issues;
}

/**
 * Generate the validation spawn prompt
 */
export function getValidationSpawnPrompt(specPath: string): string {
  return `## SPAWN PARALLEL VALIDATION ARCHITECTS

Spawn all three validation architects in parallel to review the implementation:

\`\`\`
// 1. Functional Completeness Review
Task(
  subagent_type="oh-my-claudecode:architect",
  model="opus",
  prompt="FUNCTIONAL COMPLETENESS REVIEW

Read the original spec at: ${specPath}

Verify every requirement has been implemented:
1. Check each functional requirement
2. Check each non-functional requirement
3. Verify acceptance criteria are met
4. Test core user workflows

Output: APPROVED or REJECTED with specific gaps"
)

// 2. Security Review
Task(
  subagent_type="oh-my-claudecode:security-reviewer",
  model="opus",
  prompt="SECURITY REVIEW

Review the codebase for security vulnerabilities:
1. Input validation and sanitization
2. Authentication/authorization
3. Injection vulnerabilities (SQL, command, XSS)
4. Sensitive data handling
5. Error message exposure
6. Dependencies with known vulnerabilities

Output: APPROVED or REJECTED with specific issues"
)

// 3. Code Quality Review
Task(
  subagent_type="oh-my-claudecode:code-reviewer",
  model="opus",
  prompt="CODE QUALITY REVIEW

Review code quality and maintainability:
1. Code organization and architecture
2. Error handling completeness
3. Test coverage
4. Documentation
5. Best practices adherence
6. Technical debt

Output: APPROVED or REJECTED with specific issues"
)
\`\`\`

Wait for all three architects to complete, then aggregate verdicts.
`;
}

/**
 * Format validation results for display
 */
export function formatValidationResults(state: AutopilotState): string {
  const lines: string[] = [
    '## Validation Results',
    `Round: ${state.validation.validation_rounds}`,
    ''
  ];

  for (const verdict of state.validation.verdicts) {
    const icon = verdict.verdict === 'APPROVED' ? '✓' : '✗';
    lines.push(`${icon} **${verdict.type.toUpperCase()}**: ${verdict.verdict}`);

    if (verdict.issues && verdict.issues.length > 0) {
      for (const issue of verdict.issues) {
        lines.push(`  - ${issue}`);
      }
    }
  }

  lines.push('');

  if (state.validation.all_approved) {
    lines.push('**Result: ALL APPROVED** - Ready to complete');
  } else {
    lines.push('**Result: NEEDS FIXES** - Address issues above');
  }

  return lines.join('\n');
}
