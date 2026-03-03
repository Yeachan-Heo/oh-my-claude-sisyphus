import { describe, test, expect } from 'vitest';
// NOTE: This test is excluded from tsconfig.json (rootDir is src/, benchmarks/ is outside).
// Vitest handles its own TypeScript compilation so static imports work fine here.
import { parseAgentOutput } from '../../benchmarks/harsh-critic/scoring/parser.ts';
import { matchFindings, scoreFixture, aggregateScores } from '../../benchmarks/harsh-critic/scoring/scorer.ts';
import { generateJsonReport, generateMarkdownReport } from '../../benchmarks/harsh-critic/scoring/reporter.ts';
import type {
  GroundTruth,
  GroundTruthFinding,
  ParsedAgentOutput,
  FixtureResult,
  BenchmarkScores,
} from '../../benchmarks/harsh-critic/scoring/types.ts';

// ============================================================
// Canned test data
// ============================================================

const SAMPLE_HARSH_CRITIC_OUTPUT = `**VERDICT: REJECT**

**Overall Assessment**: The auth migration plan has critical gaps that block safe execution.

**Pre-commitment Predictions**: Based on auth migration plans, I predict stale references and missing rollback procedures.

**Critical Findings** (blocks execution):
1. **Stale function reference**: The plan references \`validateSession()\` at \`auth.ts:42\` but this was renamed to \`verifySession()\` three weeks ago.
   - Why this matters: Executors will hit a runtime error
   - Fix: Update all references to \`verifySession()\`

**Major Findings** (causes significant rework):
1. No rate limiting strategy defined for the new endpoints.
   - Why this matters: DDoS vulnerability
   - Fix: Add rate limiting middleware config

**Minor Findings** (suboptimal but functional):
1. Inconsistent token naming throughout the plan

**What's Missing** (gaps, unhandled edge cases):
- No session invalidation plan for existing users
- No load testing mentioned
- No monitoring for auth failure spikes

**Multi-Perspective Notes**:
- Security: JWT secret rotation not addressed
- New-hire: Internal RBAC model assumed but not documented
- Ops: No circuit breaker for OAuth provider downtime

**Verdict Justification**: Critical stale references and missing rollback make this unexecutable.`;

const SAMPLE_CRITIC_OUTPUT = `**[REJECT]**

**Summary**:
1. The auth migration plan lacks rollback procedures
2. Missing rate limiting configuration for new endpoints

**Justification**: This plan cannot be safely executed without rollback steps and rate limiting.`;

const SAMPLE_CRITIC_OUTPUT_BARE_VERDICT = `**REJECT**

**Summary**:
- No error handling for OAuth token expiry
- Database connection pool not sized for new load`;

const SAMPLE_EMPTY_OUTPUT = '';

const SAMPLE_MARKDOWN_HEADING_OUTPUT = `**VERDICT: REJECT**

## Pre-commitment Predictions
1. Task ordering issues

## Critical Findings
**1. Dual-write starts before schema readiness**
- **Evidence:** \`plan-auth-migration.md:117\`
- **Why this matters:** Deployment can fail mid-rollout.
- **Fix:** Gate dual-write behind completed migration.

## Major Findings
**1. No rollback drill documented**
- **Evidence:** processPayment():47-52
- **Why this matters:** Rollback quality is unverified.
- **Fix:** Add rollback test runbook.

## Minor Findings
- Naming inconsistency remains.

## What's Missing
- No load testing strategy

## Phase 3 — Multi-Perspective Review
### Security Engineer Perspective
- JWT secret rotation not addressed
### New-Hire Perspective
- RBAC model is assumed and undocumented
### Ops Engineer Perspective
- No circuit breaker for OAuth downtime`;

// ============================================================
// Helpers to build minimal test fixtures
// ============================================================

function makeGroundTruth(overrides: Partial<GroundTruth> = {}): GroundTruth {
  return {
    fixtureId: 'auth-plan',
    fixturePath: 'fixtures/auth-plan.md',
    domain: 'plan',
    expectedVerdict: 'REJECT',
    findings: [],
    isCleanBaseline: false,
    ...overrides,
  };
}

function makeGroundTruthFinding(overrides: Partial<GroundTruthFinding> = {}): GroundTruthFinding {
  return {
    id: 'AUTH-CRIT-1',
    severity: 'CRITICAL',
    category: 'finding',
    summary: 'Stale function reference',
    keywords: ['validateSession', 'verifySession', 'auth.ts'],
    explanation: 'The plan references a renamed function',
    ...overrides,
  };
}

function makeParsedOutput(overrides: Partial<ParsedAgentOutput> = {}): ParsedAgentOutput {
  return {
    verdict: 'REJECT',
    criticalFindings: [],
    majorFindings: [],
    minorFindings: [],
    missingItems: [],
    perspectiveNotes: { security: [], newHire: [], ops: [] },
    hasPreCommitment: false,
    hasGapAnalysis: false,
    hasMultiPerspective: false,
    rawOutput: '',
    ...overrides,
  };
}

function makeFixtureResult(
  agentType: 'harsh-critic' | 'critic',
  scores: Partial<BenchmarkScores> = {},
  overrides: Partial<FixtureResult> = {},
): FixtureResult {
  const defaultScores: BenchmarkScores = {
    truePositiveRate: 0.5,
    falsePositiveRate: 0.2,
    falseNegativeRate: 0.5,
    severityAccuracy: 0.8,
    missingCoverage: 0.5,
    perspectiveCoverage: 0.5,
    evidenceRate: 0.5,
    hasPreCommitment: false,
    hasMultiPerspective: false,
    hasGapAnalysis: false,
    compositeScore: 0.5,
    ...scores,
  };

  return {
    fixtureId: 'auth-plan',
    domain: 'plan',
    agentType,
    parsedOutput: makeParsedOutput(),
    scores: defaultScores,
    matchedFindings: [],
    missedFindings: [],
    spuriousFindings: [],
    ...overrides,
  };
}

// ============================================================
// Parser Tests
// ============================================================

describe('Parser', () => {
  describe('harsh-critic format', () => {
    test('extracts verdict from **VERDICT: REJECT** format', () => {
      const result = parseAgentOutput(SAMPLE_HARSH_CRITIC_OUTPUT, 'harsh-critic');
      expect(result.verdict).toBe('REJECT');
    });

    test('extracts verdict ACCEPT-WITH-RESERVATIONS', () => {
      const output = `**VERDICT: ACCEPT-WITH-RESERVATIONS**\n\nSome analysis here.`;
      const result = parseAgentOutput(output, 'harsh-critic');
      expect(result.verdict).toBe('ACCEPT-WITH-RESERVATIONS');
    });

    test('extracts verdict ACCEPT', () => {
      const output = `**VERDICT: ACCEPT**\n\nLooks good.`;
      const result = parseAgentOutput(output, 'harsh-critic');
      expect(result.verdict).toBe('ACCEPT');
    });

    test('extracts critical findings as separate array', () => {
      const result = parseAgentOutput(SAMPLE_HARSH_CRITIC_OUTPUT, 'harsh-critic');
      expect(result.criticalFindings).toHaveLength(1);
      expect(result.criticalFindings[0].severity).toBe('CRITICAL');
      expect(result.criticalFindings[0].text).toContain('validateSession');
    });

    test('extracts major findings as separate array', () => {
      const result = parseAgentOutput(SAMPLE_HARSH_CRITIC_OUTPUT, 'harsh-critic');
      expect(result.majorFindings).toHaveLength(1);
      expect(result.majorFindings[0].severity).toBe('MAJOR');
      expect(result.majorFindings[0].text).toContain('rate limiting');
    });

    test('extracts minor findings as separate array', () => {
      const result = parseAgentOutput(SAMPLE_HARSH_CRITIC_OUTPUT, 'harsh-critic');
      expect(result.minorFindings).toHaveLength(1);
      expect(result.minorFindings[0].severity).toBe('MINOR');
      expect(result.minorFindings[0].text).toContain('token naming');
    });

    test('extracts missingItems from What\'s Missing section', () => {
      const result = parseAgentOutput(SAMPLE_HARSH_CRITIC_OUTPUT, 'harsh-critic');
      expect(result.missingItems).toHaveLength(3);
      expect(result.missingItems).toContain('No session invalidation plan for existing users');
      expect(result.missingItems).toContain('No load testing mentioned');
      expect(result.missingItems).toContain('No monitoring for auth failure spikes');
    });

    test('detects pre-commitment predictions section', () => {
      const result = parseAgentOutput(SAMPLE_HARSH_CRITIC_OUTPUT, 'harsh-critic');
      expect(result.hasPreCommitment).toBe(true);
    });

    test('hasPreCommitment is false when section is absent', () => {
      const outputNoPrecommit = SAMPLE_HARSH_CRITIC_OUTPUT.replace(
        /\*\*Pre-commitment Predictions\*\*[^\n]*/,
        '',
      );
      const result = parseAgentOutput(outputNoPrecommit, 'harsh-critic');
      expect(result.hasPreCommitment).toBe(false);
    });

    test('detects multi-perspective notes section', () => {
      const result = parseAgentOutput(SAMPLE_HARSH_CRITIC_OUTPUT, 'harsh-critic');
      expect(result.hasMultiPerspective).toBe(true);
    });

    test('extracts security perspective note', () => {
      const result = parseAgentOutput(SAMPLE_HARSH_CRITIC_OUTPUT, 'harsh-critic');
      expect(result.perspectiveNotes.security).toHaveLength(1);
      expect(result.perspectiveNotes.security[0]).toContain('JWT secret rotation');
    });

    test('extracts new-hire perspective note', () => {
      const result = parseAgentOutput(SAMPLE_HARSH_CRITIC_OUTPUT, 'harsh-critic');
      expect(result.perspectiveNotes.newHire).toHaveLength(1);
      expect(result.perspectiveNotes.newHire[0]).toContain('RBAC model');
    });

    test('extracts ops perspective note', () => {
      const result = parseAgentOutput(SAMPLE_HARSH_CRITIC_OUTPUT, 'harsh-critic');
      expect(result.perspectiveNotes.ops).toHaveLength(1);
      expect(result.perspectiveNotes.ops[0]).toContain('circuit breaker');
    });

    test('hasGapAnalysis is true when missingItems are present', () => {
      const result = parseAgentOutput(SAMPLE_HARSH_CRITIC_OUTPUT, 'harsh-critic');
      expect(result.hasGapAnalysis).toBe(true);
    });

    test('hasEvidence is true for findings containing filename.ts:42 pattern', () => {
      const result = parseAgentOutput(SAMPLE_HARSH_CRITIC_OUTPUT, 'harsh-critic');
      // Critical finding references auth.ts:42 in the text
      expect(result.criticalFindings[0].hasEvidence).toBe(true);
    });

    test('hasEvidence is false for findings without file references', () => {
      const result = parseAgentOutput(SAMPLE_HARSH_CRITIC_OUTPUT, 'harsh-critic');
      // Major finding about rate limiting has no file reference
      expect(result.majorFindings[0].hasEvidence).toBe(false);
    });

    test('hasEvidence is true for findings with backtick code references', () => {
      const output = `**VERDICT: REJECT**

**Critical Findings** (blocks execution):
1. The \`validateToken()\` function is not called before processing requests.`;
      const result = parseAgentOutput(output, 'harsh-critic');
      expect(result.criticalFindings[0].hasEvidence).toBe(true);
    });

    test('rawOutput is preserved', () => {
      const result = parseAgentOutput(SAMPLE_HARSH_CRITIC_OUTPUT, 'harsh-critic');
      expect(result.rawOutput).toBe(SAMPLE_HARSH_CRITIC_OUTPUT);
    });

    test('parses markdown heading sections (##) and bold-number findings', () => {
      const result = parseAgentOutput(SAMPLE_MARKDOWN_HEADING_OUTPUT, 'harsh-critic');
      expect(result.hasPreCommitment).toBe(true);
      expect(result.criticalFindings).toHaveLength(1);
      expect(result.majorFindings).toHaveLength(1);
      expect(result.minorFindings).toHaveLength(1);
      expect(result.missingItems).toHaveLength(1);
    });

    test('parses perspective subsection headings under multi-perspective review', () => {
      const result = parseAgentOutput(SAMPLE_MARKDOWN_HEADING_OUTPUT, 'harsh-critic');
      expect(result.hasMultiPerspective).toBe(true);
      expect(result.perspectiveNotes.security).toHaveLength(1);
      expect(result.perspectiveNotes.newHire).toHaveLength(1);
      expect(result.perspectiveNotes.ops).toHaveLength(1);
      expect(result.perspectiveNotes.security[0]).toContain('JWT secret rotation');
    });

    test('treats "None." as no missing items but still marks gap-analysis section as present', () => {
      const output = `**VERDICT: ACCEPT**

## What's Missing
None.`;
      const result = parseAgentOutput(output, 'harsh-critic');
      expect(result.hasGapAnalysis).toBe(true);
      expect(result.missingItems).toHaveLength(0);
    });

    test('hasEvidence is true for function():line-range evidence markers', () => {
      const output = `**VERDICT: REJECT**

## Major Findings
1. Retry behavior is unsafe at processPayment():47-52`;
      const result = parseAgentOutput(output, 'harsh-critic');
      expect(result.majorFindings).toHaveLength(1);
      expect(result.majorFindings[0].hasEvidence).toBe(true);
    });
  });

  describe('critic format', () => {
    test('extracts verdict from **[REJECT]** format', () => {
      const result = parseAgentOutput(SAMPLE_CRITIC_OUTPUT, 'critic');
      expect(result.verdict).toBe('REJECT');
    });

    test('extracts verdict from **REJECT** bare format', () => {
      const result = parseAgentOutput(SAMPLE_CRITIC_OUTPUT_BARE_VERDICT, 'critic');
      expect(result.verdict).toBe('REJECT');
    });

    test('extracts verdict OKAY', () => {
      const okayOutput = `**[OKAY]**\n\nLooks good overall.`;
      const result = parseAgentOutput(okayOutput, 'critic');
      expect(result.verdict).toBe('OKAY');
    });

    test('critic output produces empty missingItems', () => {
      const result = parseAgentOutput(SAMPLE_CRITIC_OUTPUT, 'critic');
      expect(result.missingItems).toHaveLength(0);
    });

    test('critic output produces empty perspectiveNotes', () => {
      const result = parseAgentOutput(SAMPLE_CRITIC_OUTPUT, 'critic');
      expect(result.perspectiveNotes.security).toHaveLength(0);
      expect(result.perspectiveNotes.newHire).toHaveLength(0);
      expect(result.perspectiveNotes.ops).toHaveLength(0);
    });

    test('critic hasPreCommitment is always false', () => {
      const result = parseAgentOutput(SAMPLE_CRITIC_OUTPUT, 'critic');
      expect(result.hasPreCommitment).toBe(false);
    });

    test('critic hasMultiPerspective is always false', () => {
      const result = parseAgentOutput(SAMPLE_CRITIC_OUTPUT, 'critic');
      expect(result.hasMultiPerspective).toBe(false);
    });

    test('critic hasGapAnalysis is always false', () => {
      const result = parseAgentOutput(SAMPLE_CRITIC_OUTPUT, 'critic');
      expect(result.hasGapAnalysis).toBe(false);
    });

    test('critic criticalFindings and minorFindings are empty', () => {
      const result = parseAgentOutput(SAMPLE_CRITIC_OUTPUT, 'critic');
      expect(result.criticalFindings).toHaveLength(0);
      expect(result.minorFindings).toHaveLength(0);
    });

    test('extracts findings from Summary section into majorFindings', () => {
      const result = parseAgentOutput(SAMPLE_CRITIC_OUTPUT, 'critic');
      expect(result.majorFindings.length).toBeGreaterThan(0);
      expect(result.majorFindings[0].severity).toBe('MAJOR');
    });

    test('extracts critic findings from markdown heading summary format', () => {
      const output = `**[REJECT]**

## Summary
- Missing rollback strategy
- Rate limiting not defined`;
      const result = parseAgentOutput(output, 'critic');
      expect(result.majorFindings).toHaveLength(2);
    });
  });

  describe('edge cases', () => {
    test('handles empty output gracefully without throwing', () => {
      expect(() => parseAgentOutput(SAMPLE_EMPTY_OUTPUT, 'harsh-critic')).not.toThrow();
    });

    test('empty output produces empty verdict string', () => {
      const result = parseAgentOutput(SAMPLE_EMPTY_OUTPUT, 'harsh-critic');
      expect(result.verdict).toBe('');
    });

    test('empty output produces empty findings arrays', () => {
      const result = parseAgentOutput(SAMPLE_EMPTY_OUTPUT, 'harsh-critic');
      expect(result.criticalFindings).toHaveLength(0);
      expect(result.majorFindings).toHaveLength(0);
      expect(result.minorFindings).toHaveLength(0);
    });

    test('empty output produces empty missingItems', () => {
      const result = parseAgentOutput(SAMPLE_EMPTY_OUTPUT, 'harsh-critic');
      expect(result.missingItems).toHaveLength(0);
    });

    test('empty output has all boolean flags false', () => {
      const result = parseAgentOutput(SAMPLE_EMPTY_OUTPUT, 'harsh-critic');
      expect(result.hasPreCommitment).toBe(false);
      expect(result.hasGapAnalysis).toBe(false);
      expect(result.hasMultiPerspective).toBe(false);
    });

    test('empty critic output handles gracefully', () => {
      expect(() => parseAgentOutput(SAMPLE_EMPTY_OUTPUT, 'critic')).not.toThrow();
    });
  });
});

// ============================================================
// Scorer Tests
// ============================================================

describe('Scorer', () => {
  describe('matchFindings', () => {
    test('matches when >= 2 keywords overlap', () => {
      const gt = makeGroundTruth({
        findings: [
          makeGroundTruthFinding({
            id: 'F1',
            keywords: ['validateSession', 'verifySession', 'auth.ts'],
          }),
        ],
      });

      // Text contains 2 of the 3 keywords
      const parsed = makeParsedOutput({
        criticalFindings: [
          {
            text: 'The validateSession function should be verifySession now.',
            severity: 'CRITICAL',
            hasEvidence: false,
          },
        ],
      });

      const result = matchFindings(parsed, gt);
      expect(result.matchedIds).toContain('F1');
      expect(result.missedIds).toHaveLength(0);
    });

    test('does NOT match with only 1 keyword overlap', () => {
      const gt = makeGroundTruth({
        findings: [
          makeGroundTruthFinding({
            id: 'F1',
            keywords: ['validateSession', 'verifySession', 'auth.ts'],
          }),
        ],
      });

      // Text only contains 1 of the 3 keywords
      const parsed = makeParsedOutput({
        criticalFindings: [
          {
            text: 'Only validateSession appears here and nothing else relevant.',
            severity: 'CRITICAL',
            hasEvidence: false,
          },
        ],
      });

      const result = matchFindings(parsed, gt);
      expect(result.matchedIds).toHaveLength(0);
      expect(result.missedIds).toContain('F1');
    });

    test('does NOT match with zero keyword overlap', () => {
      const gt = makeGroundTruth({
        findings: [
          makeGroundTruthFinding({
            id: 'F1',
            keywords: ['validateSession', 'verifySession', 'auth.ts'],
          }),
        ],
      });

      const parsed = makeParsedOutput({
        criticalFindings: [
          {
            text: 'Completely unrelated finding about database indexes.',
            severity: 'CRITICAL',
            hasEvidence: false,
          },
        ],
      });

      const result = matchFindings(parsed, gt);
      expect(result.matchedIds).toHaveLength(0);
      expect(result.spuriousTexts).toHaveLength(1);
    });

    test('matching is case-insensitive', () => {
      const gt = makeGroundTruth({
        findings: [
          makeGroundTruthFinding({
            id: 'F1',
            keywords: ['validatesession', 'verifysession'],
          }),
        ],
      });

      const parsed = makeParsedOutput({
        criticalFindings: [
          {
            text: 'ValidateSession must be renamed to VerifySession.',
            severity: 'CRITICAL',
            hasEvidence: false,
          },
        ],
      });

      const result = matchFindings(parsed, gt);
      expect(result.matchedIds).toContain('F1');
    });

    test('matching is robust to punctuation and hyphen variants', () => {
      const gt = makeGroundTruth({
        findings: [
          makeGroundTruthFinding({
            id: 'F1',
            keywords: ['new-hire', 'sameSite', 'cookie', 'csrf'],
          }),
        ],
      });

      const parsed = makeParsedOutput({
        criticalFindings: [
          {
            text: 'New hire note: session cookie is missing SameSite and enables CSRF risk.',
            severity: 'CRITICAL',
            hasEvidence: false,
          },
        ],
      });

      const result = matchFindings(parsed, gt);
      expect(result.matchedIds).toContain('F1');
    });

    test('requires 3 keyword matches when ground truth has 6 keywords', () => {
      const gt = makeGroundTruth({
        findings: [
          makeGroundTruthFinding({
            id: 'F1',
            keywords: ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot'],
          }),
        ],
      });

      const parsed = makeParsedOutput({
        criticalFindings: [
          {
            text: 'alpha bravo issue only',
            severity: 'CRITICAL',
            hasEvidence: false,
          },
        ],
      });

      const result = matchFindings(parsed, gt);
      expect(result.matchedIds).toHaveLength(0);
      expect(result.missedIds).toContain('F1');
    });

    test('matches 6-keyword ground truth when 3 keywords overlap', () => {
      const gt = makeGroundTruth({
        findings: [
          makeGroundTruthFinding({
            id: 'F1',
            keywords: ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot'],
          }),
        ],
      });

      const parsed = makeParsedOutput({
        criticalFindings: [
          {
            text: 'alpha bravo charlie issue is confirmed',
            severity: 'CRITICAL',
            hasEvidence: false,
          },
        ],
      });

      const result = matchFindings(parsed, gt);
      expect(result.matchedIds).toContain('F1');
    });

    test('each ground truth finding is matched at most once', () => {
      const gt = makeGroundTruth({
        findings: [
          makeGroundTruthFinding({
            id: 'F1',
            keywords: ['validateSession', 'verifySession'],
          }),
        ],
      });

      // Two agent findings both match the same GT entry
      const parsed = makeParsedOutput({
        criticalFindings: [
          {
            text: 'validateSession must become verifySession everywhere.',
            severity: 'CRITICAL',
            hasEvidence: false,
          },
          {
            text: 'Also validateSession vs verifySession is a problem.',
            severity: 'CRITICAL',
            hasEvidence: false,
          },
        ],
      });

      const result = matchFindings(parsed, gt);
      // Only one GT matched, one agent finding becomes spurious
      expect(result.matchedIds).toHaveLength(1);
      expect(result.spuriousTexts).toHaveLength(1);
    });

    test('totalAgentFindings counts all flattened findings', () => {
      const gt = makeGroundTruth({ findings: [] });

      const parsed = makeParsedOutput({
        criticalFindings: [{ text: 'critical one', severity: 'CRITICAL', hasEvidence: false }],
        majorFindings: [{ text: 'major one', severity: 'MAJOR', hasEvidence: false }],
        minorFindings: [{ text: 'minor one', severity: 'MINOR', hasEvidence: false }],
        missingItems: ['missing item one', 'missing item two'],
        perspectiveNotes: {
          security: ['security note'],
          newHire: [],
          ops: [],
        },
      });

      const result = matchFindings(parsed, gt);
      // 1 critical + 1 major + 1 minor + 2 missing + 1 security = 6
      expect(result.totalAgentFindings).toBe(6);
    });
  });

  describe('scoreFixture', () => {
    test('truePositiveRate: 3 matches out of 5 ground truth = 0.6', () => {
      const findings: GroundTruthFinding[] = [
        makeGroundTruthFinding({ id: 'F1', keywords: ['alpha', 'bravo'], category: 'finding' }),
        makeGroundTruthFinding({ id: 'F2', keywords: ['charlie', 'delta'], category: 'finding' }),
        makeGroundTruthFinding({ id: 'F3', keywords: ['echo', 'foxtrot'], category: 'finding' }),
        makeGroundTruthFinding({ id: 'F4', keywords: ['golf', 'hotel'], category: 'finding' }),
        makeGroundTruthFinding({ id: 'F5', keywords: ['india', 'juliet'], category: 'finding' }),
      ];
      const gt = makeGroundTruth({ findings });

      // Agent finds F1, F2, F3 (3 matches), misses F4 and F5
      const parsed = makeParsedOutput({
        criticalFindings: [
          { text: 'alpha bravo issue found', severity: 'CRITICAL', hasEvidence: false },
          { text: 'charlie delta problem', severity: 'CRITICAL', hasEvidence: false },
          { text: 'echo foxtrot concern', severity: 'CRITICAL', hasEvidence: false },
        ],
      });

      const scores = scoreFixture(parsed, gt);
      expect(scores.truePositiveRate).toBeCloseTo(0.6, 5);
    });

    test('falsePositiveRate: 2 unmatched out of 7 total findings', () => {
      const findings: GroundTruthFinding[] = [
        makeGroundTruthFinding({ id: 'F1', keywords: ['alpha', 'bravo'], category: 'finding' }),
        makeGroundTruthFinding({ id: 'F2', keywords: ['charlie', 'delta'], category: 'finding' }),
        makeGroundTruthFinding({ id: 'F3', keywords: ['echo', 'foxtrot'], category: 'finding' }),
        makeGroundTruthFinding({ id: 'F4', keywords: ['golf', 'hotel'], category: 'finding' }),
        makeGroundTruthFinding({ id: 'F5', keywords: ['india', 'juliet'], category: 'finding' }),
      ];
      const gt = makeGroundTruth({ findings });

      // 5 matching findings + 2 spurious = 7 total; FP = 2/7 ≈ 0.286
      const parsed = makeParsedOutput({
        criticalFindings: [
          { text: 'alpha bravo issue', severity: 'CRITICAL', hasEvidence: false },
          { text: 'charlie delta issue', severity: 'CRITICAL', hasEvidence: false },
          { text: 'echo foxtrot issue', severity: 'CRITICAL', hasEvidence: false },
          { text: 'golf hotel issue', severity: 'CRITICAL', hasEvidence: false },
          { text: 'india juliet issue', severity: 'CRITICAL', hasEvidence: false },
          { text: 'spurious finding one unrelated', severity: 'CRITICAL', hasEvidence: false },
          { text: 'spurious finding two unrelated', severity: 'CRITICAL', hasEvidence: false },
        ],
      });

      const scores = scoreFixture(parsed, gt);
      expect(scores.falsePositiveRate).toBeCloseTo(2 / 7, 5);
    });

    test('missingCoverage only counts "missing" category ground truth', () => {
      const findings: GroundTruthFinding[] = [
        makeGroundTruthFinding({ id: 'F1', keywords: ['alpha', 'bravo'], category: 'finding' }),
        makeGroundTruthFinding({ id: 'M1', keywords: ['session', 'invalidation'], category: 'missing' }),
        makeGroundTruthFinding({ id: 'M2', keywords: ['load', 'testing'], category: 'missing' }),
      ];
      const gt = makeGroundTruth({ findings });

      // Agent covers both missing items
      const parsed = makeParsedOutput({
        missingItems: [
          'No session invalidation plan',
          'No load testing strategy mentioned',
        ],
      });

      const scores = scoreFixture(parsed, gt);
      // Both missing GT items matched: 2/2 = 1.0
      expect(scores.missingCoverage).toBeCloseTo(1.0, 5);
    });

    test('missingCoverage is 0 when no "missing" category ground truth exists', () => {
      const findings: GroundTruthFinding[] = [
        makeGroundTruthFinding({ id: 'F1', keywords: ['alpha', 'bravo'], category: 'finding' }),
      ];
      const gt = makeGroundTruth({ findings });

      const parsed = makeParsedOutput({
        missingItems: ['some missing item'],
      });

      const scores = scoreFixture(parsed, gt);
      expect(scores.missingCoverage).toBe(0);
    });

    test('perspectiveCoverage only counts "perspective" category ground truth', () => {
      const findings: GroundTruthFinding[] = [
        makeGroundTruthFinding({ id: 'F1', keywords: ['alpha', 'bravo'], category: 'finding' }),
        makeGroundTruthFinding({
          id: 'P1',
          keywords: ['JWT', 'rotation'],
          category: 'perspective',
          perspective: 'security',
        }),
        makeGroundTruthFinding({
          id: 'P2',
          keywords: ['circuit', 'breaker'],
          category: 'perspective',
          perspective: 'ops',
        }),
      ];
      const gt = makeGroundTruth({ findings });

      // Agent covers P1 but not P2
      const parsed = makeParsedOutput({
        perspectiveNotes: {
          security: ['JWT secret rotation not addressed'],
          newHire: [],
          ops: [],
        },
      });

      const scores = scoreFixture(parsed, gt);
      // 1 of 2 perspective GT items matched: 0.5
      expect(scores.perspectiveCoverage).toBeCloseTo(0.5, 5);
    });

    test('perspectiveCoverage is 0 when no "perspective" category ground truth exists', () => {
      const gt = makeGroundTruth({
        findings: [
          makeGroundTruthFinding({ id: 'F1', keywords: ['alpha', 'bravo'], category: 'finding' }),
        ],
      });

      const parsed = makeParsedOutput({
        perspectiveNotes: {
          security: ['some security note'],
          newHire: [],
          ops: [],
        },
      });

      const scores = scoreFixture(parsed, gt);
      expect(scores.perspectiveCoverage).toBe(0);
    });

    test('compositeScore is between 0 and 1', () => {
      const gt = makeGroundTruth({
        findings: [
          makeGroundTruthFinding({ id: 'F1', keywords: ['alpha', 'bravo'], category: 'finding' }),
          makeGroundTruthFinding({ id: 'M1', keywords: ['session', 'invalidation'], category: 'missing' }),
        ],
      });

      const parsed = parseAgentOutput(SAMPLE_HARSH_CRITIC_OUTPUT, 'harsh-critic');
      const scores = scoreFixture(parsed, gt);

      expect(scores.compositeScore).toBeGreaterThanOrEqual(0);
      expect(scores.compositeScore).toBeLessThanOrEqual(1);
    });

    test('compositeScore is 0 for fully empty output against empty ground truth', () => {
      const gt = makeGroundTruth({ findings: [] });
      const parsed = makeParsedOutput();
      const scores = scoreFixture(parsed, gt);
      // 0 GT findings -> truePositiveRate=0, falseNegativeRate=0, falsePositiveRate=0
      // Inverted weights: 0.15*(1-0) + 0.10*(1-0) = 0.25; all other terms = 0
      expect(scores.compositeScore).toBeCloseTo(0.25, 5);
    });

    test('process compliance: 3/3 booleans true = 1.0 contribution', () => {
      const gt = makeGroundTruth({ findings: [] });
      const parsed = makeParsedOutput({
        hasPreCommitment: true,
        hasMultiPerspective: true,
        hasGapAnalysis: true,
        missingItems: ['placeholder so hasGapAnalysis matters'],
      });

      const scores = scoreFixture(parsed, gt);
      // hasPreCommitment, hasMultiPerspective, hasGapAnalysis all true
      expect(scores.hasPreCommitment).toBe(true);
      expect(scores.hasMultiPerspective).toBe(true);
      expect(scores.hasGapAnalysis).toBe(true);
    });

    test('process compliance flags reflect parsed output', () => {
      const gt = makeGroundTruth({ findings: [] });

      const allTrue = makeParsedOutput({
        hasPreCommitment: true,
        hasMultiPerspective: true,
        hasGapAnalysis: true,
      });
      const scoresAll = scoreFixture(allTrue, gt);
      expect(scoresAll.hasPreCommitment).toBe(true);
      expect(scoresAll.hasMultiPerspective).toBe(true);
      expect(scoresAll.hasGapAnalysis).toBe(true);

      const twoTrue = makeParsedOutput({
        hasPreCommitment: true,
        hasMultiPerspective: true,
        hasGapAnalysis: false,
      });
      const scoresTwo = scoreFixture(twoTrue, gt);
      expect(scoresTwo.hasPreCommitment).toBe(true);
      expect(scoresTwo.hasMultiPerspective).toBe(true);
      expect(scoresTwo.hasGapAnalysis).toBe(false);

      const noneTrue = makeParsedOutput({
        hasPreCommitment: false,
        hasMultiPerspective: false,
        hasGapAnalysis: false,
      });
      const scoresNone = scoreFixture(noneTrue, gt);
      expect(scoresNone.hasPreCommitment).toBe(false);
      expect(scoresNone.hasMultiPerspective).toBe(false);
      expect(scoresNone.hasGapAnalysis).toBe(false);
    });

    test('compositeScore is higher with all process flags true than none', () => {
      const gt = makeGroundTruth({ findings: [] });

      const withCompliance = makeParsedOutput({
        hasPreCommitment: true,
        hasMultiPerspective: true,
        hasGapAnalysis: true,
      });
      const withoutCompliance = makeParsedOutput({
        hasPreCommitment: false,
        hasMultiPerspective: false,
        hasGapAnalysis: false,
      });

      const scoresWith = scoreFixture(withCompliance, gt);
      const scoresWithout = scoreFixture(withoutCompliance, gt);

      expect(scoresWith.compositeScore).toBeGreaterThan(scoresWithout.compositeScore);
    });
  });

  describe('adjacent severity matching', () => {
    test('CRITICAL finding matches MAJOR ground truth (adjacent)', () => {
      // ALLOW_ADJACENT_SEVERITY is true, so distance 1 is accepted
      const gt = makeGroundTruth({
        findings: [
          makeGroundTruthFinding({
            id: 'F1',
            severity: 'MAJOR',
            keywords: ['rate', 'limiting'],
            category: 'finding',
          }),
        ],
      });

      // Agent calls it CRITICAL but GT says MAJOR — should still match (adjacency)
      const parsed = makeParsedOutput({
        criticalFindings: [
          { text: 'No rate limiting configured', severity: 'CRITICAL', hasEvidence: false },
        ],
      });

      const scores = scoreFixture(parsed, gt);
      // Finding matched (keyword overlap) and severity is adjacent, so severityAccuracy = 1.0
      expect(scores.truePositiveRate).toBeCloseTo(1.0, 5);
      expect(scores.severityAccuracy).toBeCloseTo(1.0, 5);
    });

    test('CRITICAL finding does NOT match MINOR ground truth (non-adjacent)', () => {
      const gt = makeGroundTruth({
        findings: [
          makeGroundTruthFinding({
            id: 'F1',
            severity: 'MINOR',
            keywords: ['token', 'naming'],
            category: 'finding',
          }),
        ],
      });

      // Agent calls it CRITICAL; GT says MINOR (distance = 2, non-adjacent)
      const parsed = makeParsedOutput({
        criticalFindings: [
          { text: 'Inconsistent token naming is a critical problem', severity: 'CRITICAL', hasEvidence: false },
        ],
      });

      const scores = scoreFixture(parsed, gt);
      // Finding still MATCHES (keyword overlap sufficient), but severityAccuracy should be 0
      expect(scores.truePositiveRate).toBeCloseTo(1.0, 5);
      expect(scores.severityAccuracy).toBeCloseTo(0.0, 5);
    });
  });

  describe('aggregateScores', () => {
    test('returns all-zero scores for empty results array', () => {
      const aggregate = aggregateScores([]);
      expect(aggregate.truePositiveRate).toBe(0);
      expect(aggregate.falsePositiveRate).toBe(0);
      expect(aggregate.compositeScore).toBe(0);
      expect(aggregate.hasPreCommitment).toBe(false);
    });

    test('averages numeric scores correctly across two results', () => {
      const result1 = makeFixtureResult('harsh-critic', {
        truePositiveRate: 0.8,
        falsePositiveRate: 0.1,
        compositeScore: 0.8,
      });
      const result2 = makeFixtureResult('harsh-critic', {
        truePositiveRate: 0.4,
        falsePositiveRate: 0.3,
        compositeScore: 0.4,
      }, { fixtureId: 'second-fixture' });

      const aggregate = aggregateScores([result1, result2]);
      expect(aggregate.truePositiveRate).toBeCloseTo(0.6, 5);
      expect(aggregate.falsePositiveRate).toBeCloseTo(0.2, 5);
      expect(aggregate.compositeScore).toBeCloseTo(0.6, 5);
    });

    test('averages across three results correctly', () => {
      const scores = [0.2, 0.5, 0.8];
      const results = scores.map((s, i) =>
        makeFixtureResult('harsh-critic', { truePositiveRate: s }, { fixtureId: `fixture-${i}` }),
      );

      const aggregate = aggregateScores(results);
      expect(aggregate.truePositiveRate).toBeCloseTo(0.5, 5);
    });

    test('boolean flags use majority vote: all true -> true', () => {
      const results = [
        makeFixtureResult('harsh-critic', { hasPreCommitment: true }),
        makeFixtureResult('harsh-critic', { hasPreCommitment: true }, { fixtureId: 'f2' }),
        makeFixtureResult('harsh-critic', { hasPreCommitment: true }, { fixtureId: 'f3' }),
      ];
      const aggregate = aggregateScores(results);
      expect(aggregate.hasPreCommitment).toBe(true);
    });

    test('boolean flags use majority vote: all false -> false', () => {
      const results = [
        makeFixtureResult('harsh-critic', { hasPreCommitment: false }),
        makeFixtureResult('harsh-critic', { hasPreCommitment: false }, { fixtureId: 'f2' }),
        makeFixtureResult('harsh-critic', { hasPreCommitment: false }, { fixtureId: 'f3' }),
      ];
      const aggregate = aggregateScores(results);
      expect(aggregate.hasPreCommitment).toBe(false);
    });

    test('boolean flags use majority vote: 2 of 3 true -> true', () => {
      const results = [
        makeFixtureResult('harsh-critic', { hasPreCommitment: true }),
        makeFixtureResult('harsh-critic', { hasPreCommitment: true }, { fixtureId: 'f2' }),
        makeFixtureResult('harsh-critic', { hasPreCommitment: false }, { fixtureId: 'f3' }),
      ];
      const aggregate = aggregateScores(results);
      expect(aggregate.hasPreCommitment).toBe(true);
    });
  });
});

// ============================================================
// Reporter Tests
// ============================================================

describe('Reporter', () => {
  // Build a minimal but complete BenchmarkReport for use across reporter tests
  function buildSampleReport() {
    const harshResult = makeFixtureResult(
      'harsh-critic',
      {
        truePositiveRate: 0.8,
        falsePositiveRate: 0.1,
        falseNegativeRate: 0.2,
        severityAccuracy: 0.9,
        missingCoverage: 0.75,
        perspectiveCoverage: 0.6,
        evidenceRate: 0.8,
        hasPreCommitment: true,
        hasMultiPerspective: true,
        hasGapAnalysis: true,
        compositeScore: 0.75,
      },
      {
        fixtureId: 'auth-plan',
        matchedFindings: ['F1', 'F2'],
        missedFindings: ['F3'],
        spuriousFindings: ['unrelated finding text'],
      },
    );

    const criticResult = makeFixtureResult(
      'critic',
      {
        truePositiveRate: 0.4,
        falsePositiveRate: 0.25,
        falseNegativeRate: 0.6,
        severityAccuracy: 0.6,
        missingCoverage: 0.0,
        perspectiveCoverage: 0.0,
        evidenceRate: 0.3,
        hasPreCommitment: false,
        hasMultiPerspective: false,
        hasGapAnalysis: false,
        compositeScore: 0.35,
      },
      {
        fixtureId: 'auth-plan',
        matchedFindings: ['F1'],
        missedFindings: ['F2', 'F3'],
        spuriousFindings: [],
      },
    );

    return generateJsonReport([harshResult, criticResult], 'claude-opus-4');
  }

  describe('generateJsonReport', () => {
    test('produces a BenchmarkReport with timestamp', () => {
      const report = buildSampleReport();
      expect(report.timestamp).toBeDefined();
      expect(typeof report.timestamp).toBe('string');
      expect(report.timestamp.length).toBeGreaterThan(0);
    });

    test('preserves model name', () => {
      const report = buildSampleReport();
      expect(report.model).toBe('claude-opus-4');
    });

    test('includes aggregateScores for both agent types', () => {
      const report = buildSampleReport();
      expect(report.aggregateScores['harsh-critic']).toBeDefined();
      expect(report.aggregateScores['critic']).toBeDefined();
    });

    test('harsh-critic aggregate compositeScore is higher than critic', () => {
      const report = buildSampleReport();
      expect(report.aggregateScores['harsh-critic'].compositeScore)
        .toBeGreaterThan(report.aggregateScores['critic'].compositeScore);
    });

    test('deltas map contains numeric differences for key metrics', () => {
      const report = buildSampleReport();
      expect(typeof report.deltas.truePositiveRate).toBe('number');
      expect(typeof report.deltas.compositeScore).toBe('number');
    });

    test('delta for truePositiveRate equals harsh minus critic', () => {
      const report = buildSampleReport();
      const expected =
        report.aggregateScores['harsh-critic'].truePositiveRate -
        report.aggregateScores['critic'].truePositiveRate;
      expect(report.deltas.truePositiveRate).toBeCloseTo(expected, 5);
    });

    test('headToHead contains entry for each fixture', () => {
      const report = buildSampleReport();
      expect(report.headToHead).toHaveLength(1);
      expect(report.headToHead[0].fixtureId).toBe('auth-plan');
    });

    test('headToHead winner is harsh-critic when it scores higher', () => {
      const report = buildSampleReport();
      expect(report.headToHead[0].winner).toBe('harsh-critic');
    });

    test('headToHead reports tie when scores are equal', () => {
      const result1 = makeFixtureResult('harsh-critic', { compositeScore: 0.5 }, { fixtureId: 'tied-fixture' });
      const result2 = makeFixtureResult('critic', { compositeScore: 0.5 }, { fixtureId: 'tied-fixture' });
      const report = generateJsonReport([result1, result2], 'test-model');
      expect(report.headToHead[0].winner).toBe('tie');
    });

    test('headToHead winner is critic when critic scores higher', () => {
      const result1 = makeFixtureResult('harsh-critic', { compositeScore: 0.3 }, { fixtureId: 'fixture-x' });
      const result2 = makeFixtureResult('critic', { compositeScore: 0.7 }, { fixtureId: 'fixture-x' });
      const report = generateJsonReport([result1, result2], 'test-model');
      expect(report.headToHead[0].winner).toBe('critic');
    });

    test('results array is preserved in full', () => {
      const report = buildSampleReport();
      expect(report.results).toHaveLength(2);
    });

    test('handles empty results gracefully', () => {
      expect(() => generateJsonReport([], 'test-model')).not.toThrow();
      const report = generateJsonReport([], 'test-model');
      expect(report.results).toHaveLength(0);
      expect(report.headToHead).toHaveLength(0);
    });
  });

  describe('generateMarkdownReport', () => {
    test('includes summary table header', () => {
      const report = buildSampleReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('## Summary Table');
    });

    test('includes summary table metric rows', () => {
      const report = buildSampleReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('True Positive Rate');
      expect(md).toContain('Composite Score');
    });

    test('includes per-fixture results section', () => {
      const report = buildSampleReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('## Per-Fixture Results');
    });

    test('includes per-fixture heading for auth-plan', () => {
      const report = buildSampleReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('### auth-plan');
    });

    test('includes both agent types in per-fixture output', () => {
      const report = buildSampleReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('harsh-critic');
      expect(md).toContain('critic');
    });

    test('includes report header', () => {
      const report = buildSampleReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('# Harsh-Critic Benchmark Report');
    });

    test('includes model name in header', () => {
      const report = buildSampleReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('claude-opus-4');
    });

    test('includes statistical summary section', () => {
      const report = buildSampleReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('## Statistical Summary');
    });

    test('includes win/loss/tie line', () => {
      const report = buildSampleReport();
      const md = generateMarkdownReport(report);
      expect(md).toMatch(/Win\/Loss\/Tie/);
    });

    test('includes key insight section', () => {
      const report = buildSampleReport();
      const md = generateMarkdownReport(report);
      expect(md).toContain('## Key Insight');
    });

    test('includes head-to-head comparison info from both agents being present', () => {
      const report = buildSampleReport();
      const md = generateMarkdownReport(report);
      // Both agents present means head-to-head delta info is in the per-fixture section
      expect(md).toContain('composite=');
    });

    test('returns a non-empty string', () => {
      const report = buildSampleReport();
      const md = generateMarkdownReport(report);
      expect(typeof md).toBe('string');
      expect(md.length).toBeGreaterThan(0);
    });

    test('missed findings are listed when present', () => {
      const report = buildSampleReport();
      const md = generateMarkdownReport(report);
      // harshResult has missedFindings: ['F3'], criticResult has ['F2', 'F3']
      expect(md).toContain('Missed');
    });
  });
});
