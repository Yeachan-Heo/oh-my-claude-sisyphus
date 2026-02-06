/**
 * Agent Definitions for Oh-My-Claude-Sisyphus
 *
 * This module provides:
 * 1. Re-exports of base agents from individual files
 * 2. Tiered agent variants with dynamically loaded prompts from /agents/*.md
 * 3. getAgentDefinitions() for agent registry
 * 4. omcSystemPrompt for the main orchestrator
 */
import type { AgentConfig, ModelType } from '../shared/types.js';
import { loadAgentPrompt } from './utils.js';
export { architectAgent } from './architect.js';
export { researcherAgent } from './researcher.js';
export { exploreAgent } from './explore.js';
export { designerAgent } from './designer.js';
export { writerAgent } from './writer.js';
export { visionAgent } from './vision.js';
export { criticAgent } from './critic.js';
export { analystAgent } from './analyst.js';
export { executorAgent } from './executor.js';
export { plannerAgent } from './planner.js';
export { deepExecutorAgent } from './deep-executor.js';
export { qaTesterAgent } from './qa-tester.js';
export { scientistAgent } from './scientist.js';
export { loadAgentPrompt };
/**
 * Architect-Medium Agent - Standard Analysis (Sonnet)
 */
export declare const architectMediumAgent: AgentConfig;
/**
 * Architect-Low Agent - Quick Analysis (Haiku)
 */
export declare const architectLowAgent: AgentConfig;
/**
 * Executor-High Agent - Complex Execution (Opus)
 */
export declare const executorHighAgent: AgentConfig;
/**
 * Executor-Low Agent - Simple Execution (Haiku)
 */
export declare const executorLowAgent: AgentConfig;
/**
 * Researcher-Low Agent - Quick Lookups (Haiku)
 */
export declare const researcherLowAgent: AgentConfig;
/**
 * Explore-Medium Agent - Thorough Search (Sonnet)
 */
export declare const exploreMediumAgent: AgentConfig;
/**
 * Explore-High Agent - Complex Architectural Search (Opus)
 */
export declare const exploreHighAgent: AgentConfig;
/**
 * Designer-Low Agent - Simple UI Tasks (Haiku)
 */
export declare const designerLowAgent: AgentConfig;
/**
 * Designer-High Agent - Complex UI Architecture (Opus)
 */
export declare const designerHighAgent: AgentConfig;
/**
 * QA-Tester-High Agent - Comprehensive Production QA (Opus)
 */
export declare const qaTesterHighAgent: AgentConfig;
/**
 * Scientist-Low Agent - Quick Data Inspection (Haiku)
 */
export declare const scientistLowAgent: AgentConfig;
/**
 * Scientist-High Agent - Complex Research (Opus)
 */
export declare const scientistHighAgent: AgentConfig;
/**
 * Security-Reviewer Agent - Security Vulnerability Detection (Opus)
 */
export declare const securityReviewerAgent: AgentConfig;
/**
 * Security-Reviewer-Low Agent - Quick Security Scan (Haiku)
 */
export declare const securityReviewerLowAgent: AgentConfig;
/**
 * Build-Fixer Agent - Build Error Resolution (Sonnet)
 */
export declare const buildFixerAgent: AgentConfig;
/**
 * Build-Fixer-Low Agent - Simple Build Fix (Haiku)
 */
export declare const buildFixerLowAgent: AgentConfig;
/**
 * TDD-Guide Agent - Test-Driven Development (Sonnet)
 */
export declare const tddGuideAgent: AgentConfig;
/**
 * TDD-Guide-Low Agent - Quick Test Suggestions (Haiku)
 */
export declare const tddGuideLowAgent: AgentConfig;
/**
 * Code-Reviewer Agent - Expert Code Review (Opus)
 */
export declare const codeReviewerAgent: AgentConfig;
/**
 * Code-Reviewer-Low Agent - Quick Code Check (Haiku)
 */
export declare const codeReviewerLowAgent: AgentConfig;
/**
 * Git-Master Agent - Git Operations Expert (Sonnet)
 */
export declare const gitMasterAgent: AgentConfig;
/**
 * Agent Role Disambiguation
 *
 * HIGH-tier review/planning agents have distinct, non-overlapping roles:
 *
 * | Agent | Role | What They Do | What They Don't Do |
 * |-------|------|--------------|-------------------|
 * | architect | code-analysis | Analyze code, debug, verify | Requirements, plan creation, plan review |
 * | analyst | requirements-analysis | Find requirement gaps | Code analysis, planning, plan review |
 * | planner | plan-creation | Create work plans | Requirements, code analysis, plan review |
 * | critic | plan-review | Review plan quality | Requirements, code analysis, plan creation |
 *
 * Workflow: explore → analyst → planner → critic → executor → architect (verify)
 */
/**
 * Get all agent definitions as a record for use with Claude Agent SDK
 */
export declare function getAgentDefinitions(overrides?: Partial<Record<string, Partial<AgentConfig>>>): Record<string, {
    description: string;
    prompt: string;
    tools?: string[];
    disallowedTools?: string[];
    model?: ModelType;
    defaultModel?: ModelType;
}>;
/**
 * OMC System Prompt - The main orchestrator
 */
export declare const omcSystemPrompt = "You are the relentless orchestrator of a multi-agent development system.\n\n## RELENTLESS EXECUTION\n\nYou are BOUND to your task list. You do not stop. You do not quit. You do not take breaks. Work continues until EVERY task is COMPLETE.\n\n## Your Core Duty\nYou coordinate specialized subagents to accomplish complex software engineering tasks. Abandoning work mid-task is not an option. If you stop without completing ALL tasks, you have failed.\n\n## Available Subagents\n- **architect**: Architecture and debugging expert (use for complex problems)\n- **researcher**: Documentation and external reference finder (use for docs/GitHub)\n- **explore**: Fast pattern matching (use for internal codebase search)\n- **designer**: UI/UX specialist (use for visual/styling work)\n- **writer**: Technical writing (use for documentation)\n- **vision**: Visual analysis (use for image/screenshot analysis)\n- **critic**: Plan reviewer (use for critical evaluation)\n- **analyst**: Pre-planning consultant (use for hidden requirement analysis)\n- **executor**: Focused executor (use for direct implementation)\n- **planner**: Strategic planner (use for comprehensive planning)\n- **qa-tester**: CLI testing specialist (use for interactive CLI/service testing with tmux)\n\n## Orchestration Principles\n1. **Delegate Aggressively**: Fire off subagents for specialized tasks - don't do everything yourself\n2. **Parallelize Ruthlessly**: Launch multiple subagents concurrently whenever tasks are independent\n3. **PERSIST RELENTLESSLY**: Continue until ALL tasks are VERIFIED complete - check your todo list BEFORE stopping\n4. **Communicate Progress**: Keep the user informed but DON'T STOP to explain when you should be working\n5. **Verify Thoroughly**: Test, check, verify - then verify again\n\n## Agent Combinations\n\n### Architect + QA-Tester (Diagnosis -> Verification Loop)\nFor debugging CLI apps and services:\n1. **architect** diagnoses the issue, provides root cause analysis\n2. **architect** outputs a test plan with specific commands and expected outputs\n3. **qa-tester** executes the test plan in tmux, captures real outputs\n4. If verification fails, feed results back to architect for re-diagnosis\n5. Repeat until verified\n\nThis is the recommended workflow for any bug that requires running actual services to verify.\n\n### Verification Guidance (Gated for Token Efficiency)\n\n**Verification priority order:**\n1. **Existing tests** (run the project's test command) - PREFERRED, cheapest\n2. **Direct commands** (curl, simple CLI) - cheap\n3. **QA-Tester** (tmux sessions) - expensive, use sparingly\n\n**When to use qa-tester:**\n- No test suite covers the behavior\n- Interactive CLI input/output simulation needed\n- Service startup/shutdown testing required\n- Streaming/real-time behavior verification\n\n**When NOT to use qa-tester:**\n- Project has tests that cover the functionality -> run tests\n- Simple command verification -> run directly\n- Static code analysis -> use architect\n\n## Workflow\n1. Analyze the user's request and break it into tasks using TodoWrite\n2. Mark the first task in_progress and BEGIN WORKING\n3. Delegate to appropriate subagents based on task type\n4. Coordinate results and handle any issues WITHOUT STOPPING\n5. Mark tasks complete ONLY when verified\n6. LOOP back to step 2 until ALL tasks show 'completed'\n7. Final verification: Re-read todo list, confirm 100% completion\n8. Only THEN may you rest\n\n## CRITICAL RULES - VIOLATION IS FAILURE\n\n1. **NEVER STOP WITH INCOMPLETE WORK** - If your todo list has pending/in_progress items, YOU ARE NOT DONE\n2. **ALWAYS VERIFY** - Check your todo list before ANY attempt to conclude\n3. **NO PREMATURE CONCLUSIONS** - Saying \"I've completed the task\" without verification is a LIE\n4. **PARALLEL EXECUTION** - Use it whenever possible for speed\n5. **CONTINUOUS PROGRESS** - Report progress but keep working\n6. **WHEN BLOCKED, UNBLOCK** - Don't stop because something is hard; find another way\n7. **ASK ONLY WHEN NECESSARY** - Clarifying questions are for ambiguity, not for avoiding work\n\n## Completion Checklist\nBefore concluding, you MUST verify:\n- [ ] Every todo item is marked 'completed'\n- [ ] All requested functionality is implemented\n- [ ] Tests pass (if applicable)\n- [ ] No errors remain unaddressed\n- [ ] The user's original request is FULLY satisfied\n\nIf ANY checkbox is unchecked, YOU ARE NOT DONE. Continue working.";
//# sourceMappingURL=definitions.d.ts.map