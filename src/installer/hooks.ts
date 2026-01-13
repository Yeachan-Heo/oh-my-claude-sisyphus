/**
 * Hook Scripts for Claude Code
 * Direct port of oh-my-opencode hooks for Claude Code's native hooks system
 *
 * Claude Code hooks are configured in settings.json and run as shell commands.
 * These scripts receive JSON input via stdin and output JSON to modify behavior.
 *
 * This module provides DUAL implementations:
 * - Bash scripts (.sh) for Unix-like systems (macOS, Linux)
 * - Node.js scripts (.mjs) for cross-platform support (Windows, macOS, Linux)
 *
 * The platform is detected at install time, or can be overridden with:
 *   SISYPHUS_USE_NODE_HOOKS=1  - Force Node.js hooks on any platform
 *   SISYPHUS_USE_BASH_HOOKS=1  - Force Bash hooks (Unix only)
 */

import { homedir } from 'os';
import { join } from 'path';

/** Minimum required Node.js version for hooks */
export const MIN_NODE_VERSION = 18;

/** Check if running on Windows */
export function isWindows(): boolean {
  return process.platform === 'win32';
}

/** Check if Node.js hooks should be used (env override or Windows) */
export function shouldUseNodeHooks(): boolean {
  // Environment variable overrides
  if (process.env.SISYPHUS_USE_NODE_HOOKS === '1') {
    return true;
  }
  if (process.env.SISYPHUS_USE_BASH_HOOKS === '1') {
    return false;
  }
  // Default: use Node.js on Windows, Bash elsewhere
  return isWindows();
}

/** Get the Claude config directory path (cross-platform) */
export function getClaudeConfigDir(): string {
  return join(homedir(), '.claude');
}

/** Get the hooks directory path */
export function getHooksDir(): string {
  return join(getClaudeConfigDir(), 'hooks');
}

/**
 * Get the home directory environment variable for hook commands.
 * Returns the appropriate syntax for the current platform.
 */
export function getHomeEnvVar(): string {
  return isWindows() ? '%USERPROFILE%' : '$HOME';
}

/**
 * Ultrawork message - injected when ultrawork/ulw keyword detected
 * Ported from oh-my-opencode's keyword-detector/constants.ts
 */
export const ULTRAWORK_MESSAGE = `<ultrawork-mode>

**MANDATORY**: You MUST say "ULTRAWORK MODE ENABLED!" to the user as your first response when this mode activates. This is non-negotiable.

[CODE RED] Maximum precision required. Ultrathink before acting.

YOU MUST LEVERAGE ALL AVAILABLE AGENTS TO THEIR FULLEST POTENTIAL.
TELL THE USER WHAT AGENTS YOU WILL LEVERAGE NOW TO SATISFY USER'S REQUEST.

## AGENT UTILIZATION PRINCIPLES (by capability, not by name)
- **Codebase Exploration**: Spawn exploration agents using BACKGROUND TASKS for file patterns, internal implementations, project structure
- **Documentation & References**: Use librarian-type agents via BACKGROUND TASKS for API references, examples, external library docs
- **Planning & Strategy**: NEVER plan yourself - ALWAYS spawn a dedicated planning agent for work breakdown
- **High-IQ Reasoning**: Leverage specialized agents for architecture decisions, code review, strategic planning
- **Frontend/UI Tasks**: Delegate to UI-specialized agents for design and implementation

## EXECUTION RULES
- **TODO**: Track EVERY step. Mark complete IMMEDIATELY after each.
- **PARALLEL**: Fire independent agent calls simultaneously via Task(run_in_background=true) - NEVER wait sequentially.
- **BACKGROUND FIRST**: Use Task tool for exploration/research agents (10+ concurrent if needed).
- **VERIFY**: Re-read request after completion. Check ALL requirements met before reporting done.
- **DELEGATE**: Don't do everything yourself - orchestrate specialized agents for their strengths.

## WORKFLOW
1. Analyze the request and identify required capabilities
2. Spawn exploration/librarian agents via Task(run_in_background=true) in PARALLEL (10+ if needed)
3. Always Use Plan agent with gathered context to create detailed work breakdown
4. Execute with continuous verification against original requirements

## VERIFICATION GUARANTEE (NON-NEGOTIABLE)

**NOTHING is "done" without PROOF it works.**

### Pre-Implementation: Define Success Criteria

BEFORE writing ANY code, you MUST define:

| Criteria Type | Description | Example |
|---------------|-------------|---------|
| **Functional** | What specific behavior must work | "Button click triggers API call" |
| **Observable** | What can be measured/seen | "Console shows 'success', no errors" |
| **Pass/Fail** | Binary, no ambiguity | "Returns 200 OK" not "should work" |

Write these criteria explicitly. Share with user if scope is non-trivial.

### Execution & Evidence Requirements

| Phase | Action | Required Evidence |
|-------|--------|-------------------|
| **Build** | Run build command | Exit code 0, no errors |
| **Test** | Execute test suite | All tests pass (screenshot/output) |
| **Manual Verify** | Test the actual feature | Demonstrate it works (describe what you observed) |
| **Regression** | Ensure nothing broke | Existing tests still pass |

**WITHOUT evidence = NOT verified = NOT done.**

### TDD Workflow (when test infrastructure exists)

1. **SPEC**: Define what "working" means (success criteria above)
2. **RED**: Write failing test -> Run it -> Confirm it FAILS
3. **GREEN**: Write minimal code -> Run test -> Confirm it PASSES
4. **REFACTOR**: Clean up -> Tests MUST stay green
5. **VERIFY**: Run full test suite, confirm no regressions
6. **EVIDENCE**: Report what you ran and what output you saw

### Verification Anti-Patterns (BLOCKING)

| Violation | Why It Fails |
|-----------|--------------|
| "It should work now" | No evidence. Run it. |
| "I added the tests" | Did they pass? Show output. |
| "Fixed the bug" | How do you know? What did you test? |
| "Implementation complete" | Did you verify against success criteria? |
| Skipping test execution | Tests exist to be RUN, not just written |

**CLAIM NOTHING WITHOUT PROOF. EXECUTE. VERIFY. SHOW EVIDENCE.**

## ZERO TOLERANCE FAILURES
- **NO Scope Reduction**: Never make "demo", "skeleton", "simplified", "basic" versions - deliver FULL implementation
- **NO MockUp Work**: When user asked you to do "port A", you must "port A", fully, 100%. No Extra feature, No reduced feature, no mock data, fully working 100% port.
- **NO Partial Completion**: Never stop at 60-80% saying "you can extend this..." - finish 100%
- **NO Assumed Shortcuts**: Never skip requirements you deem "optional" or "can be added later"
- **NO Premature Stopping**: Never declare done until ALL TODOs are completed and verified
- **NO TEST DELETION**: Never delete or skip failing tests to make the build pass. Fix the code, not the tests.

THE USER ASKED FOR X. DELIVER EXACTLY X. NOT A SUBSET. NOT A DEMO. NOT A STARTING POINT.

</ultrawork-mode>

---

`;

/**
 * Ultrathink/Think mode message
 * Ported from oh-my-opencode's think-mode hook
 */
export const ULTRATHINK_MESSAGE = `<think-mode>

**ULTRATHINK MODE ENABLED** - Extended reasoning activated.

You are now in deep thinking mode. Take your time to:
1. Thoroughly analyze the problem from multiple angles
2. Consider edge cases and potential issues
3. Think through the implications of each approach
4. Reason step-by-step before acting

Use your extended thinking capabilities to provide the most thorough and well-reasoned response.

</think-mode>

---

`;

/**
 * Search mode message
 * Ported from oh-my-opencode's keyword-detector
 */
export const SEARCH_MESSAGE = `<search-mode>
MAXIMIZE SEARCH EFFORT. Launch multiple background agents IN PARALLEL:
- explore agents (codebase patterns, file structures)
- librarian agents (remote repos, official docs, GitHub examples)
Plus direct tools: Grep, Glob
NEVER stop at first result - be exhaustive.
</search-mode>

---

`;

/**
 * Analyze mode message
 * Ported from oh-my-opencode's keyword-detector
 */
export const ANALYZE_MESSAGE = `<analyze-mode>
ANALYSIS MODE. Gather context before diving deep:

CONTEXT GATHERING (parallel):
- 1-2 explore agents (codebase patterns, implementations)
- 1-2 librarian agents (if external library involved)
- Direct tools: Grep, Glob, LSP for targeted searches

IF COMPLEX (architecture, multi-system, debugging after 2+ failures):
- Consult oracle agent for strategic guidance

SYNTHESIZE findings before proceeding.
</analyze-mode>

---

`;

/**
 * Todo continuation prompt
 * Ported from oh-my-opencode's todo-continuation-enforcer
 */
export const TODO_CONTINUATION_PROMPT = `[SYSTEM REMINDER - TODO CONTINUATION]

Incomplete tasks remain in your todo list. Continue working on the next pending task.

- Proceed without asking for permission
- Mark each task complete when finished
- Do not stop until all tasks are done`;

/**
 * Keyword detector hook script
 * This script is installed to ~/.claude/hooks/keyword-detector.sh
 */
export const KEYWORD_DETECTOR_SCRIPT = `#!/bin/bash
# Sisyphus Keyword Detector Hook
# Detects ultrawork/ultrathink/search/analyze keywords and injects enhanced mode messages
# Also activates persistent ultrawork state when ultrawork keyword is detected

# Read stdin (JSON input from Claude Code)
INPUT=$(cat)

# Extract directory from input
DIRECTORY=""
if command -v jq &> /dev/null; then
  DIRECTORY=$(echo "$INPUT" | jq -r '.directory // ""' 2>/dev/null)
fi
if [ -z "$DIRECTORY" ] || [ "$DIRECTORY" = "null" ]; then
  DIRECTORY=$(pwd)
fi

# Extract the prompt text - try multiple JSON paths
PROMPT=""
if command -v jq &> /dev/null; then
  # Try to extract from various possible JSON structures
  PROMPT=$(echo "$INPUT" | jq -r '
    if .prompt then .prompt
    elif .message.content then .message.content
    elif .parts then ([.parts[] | select(.type == "text") | .text] | join(" "))
    else ""
    end
  ' 2>/dev/null)
fi

# Fallback: simple grep extraction if jq fails
if [ -z "$PROMPT" ] || [ "$PROMPT" = "null" ]; then
  PROMPT=$(echo "$INPUT" | grep -oP '"(prompt|content|text)"\\s*:\\s*"\\K[^"]+' | head -1)
fi

# Exit if no prompt found
if [ -z "$PROMPT" ]; then
  echo '{"continue": true}'
  exit 0
fi

# Skip internal/hidden CLI commands (rate-limit-options, etc.)
# These are auto-generated by Claude Code and should not trigger mode activation
# Fixes infinite loop when rate limit is hit during ultrawork mode (#29)
if echo "$PROMPT" | grep -qE '^/?(rate-limit|internal-|___|---)|^/[a-z-]+$'; then
  echo '{"continue": true}'
  exit 0
fi

# Remove code blocks before checking keywords (prevents false positives)
PROMPT_NO_CODE=$(echo "$PROMPT" | sed 's/\`\`\`[^\`]*\`\`\`//g' | sed 's/\`[^\`]*\`//g')

# Convert to lowercase for case-insensitive matching
PROMPT_LOWER=$(echo "$PROMPT_NO_CODE" | tr '[:upper:]' '[:lower:]')

# Check for ultrawork keywords (highest priority)
if echo "$PROMPT_LOWER" | grep -qE '\\b(ultrawork|ulw|uw)\\b'; then
  # Create persistent ultrawork state
  mkdir -p "$DIRECTORY/.sisyphus" 2>/dev/null
  mkdir -p "$HOME/.claude" 2>/dev/null

  # Escape prompt for JSON
  PROMPT_ESCAPED=$(echo "$PROMPT" | sed 's/\\\\/\\\\\\\\/g' | sed 's/"/\\\\"/g' | tr '\\n' ' ')

  STATE_JSON="{
  \\"active\\": true,
  \\"started_at\\": \\"$(date -Iseconds)\\",
  \\"original_prompt\\": \\"$PROMPT_ESCAPED\\",
  \\"reinforcement_count\\": 0,
  \\"last_checked_at\\": \\"$(date -Iseconds)\\"
}"

  # Write state to both local and global locations
  echo "$STATE_JSON" > "$DIRECTORY/.sisyphus/ultrawork-state.json" 2>/dev/null
  echo "$STATE_JSON" > "$HOME/.claude/ultrawork-state.json" 2>/dev/null

  # Return ultrawork mode injection
  cat << 'EOF'
{"continue": true, "message": "<ultrawork-mode>\\n\\n**MANDATORY**: You MUST say \\"ULTRAWORK MODE ENABLED!\\" to the user as your first response when this mode activates. This is non-negotiable.\\n\\n[CODE RED] Maximum precision required. Ultrathink before acting.\\n\\nYOU MUST LEVERAGE ALL AVAILABLE AGENTS TO THEIR FULLEST POTENTIAL.\\nTELL THE USER WHAT AGENTS YOU WILL LEVERAGE NOW TO SATISFY USER'S REQUEST.\\n\\n## AGENT UTILIZATION PRINCIPLES\\n- **Codebase Exploration**: Spawn exploration agents using BACKGROUND TASKS\\n- **Documentation & References**: Use librarian-type agents via BACKGROUND TASKS\\n- **Planning & Strategy**: NEVER plan yourself - spawn planning agent\\n- **High-IQ Reasoning**: Use oracle for architecture decisions\\n- **Frontend/UI Tasks**: Delegate to frontend-engineer\\n\\n## EXECUTION RULES\\n- **TODO**: Track EVERY step. Mark complete IMMEDIATELY.\\n- **PARALLEL**: Fire independent calls simultaneously - NEVER wait sequentially.\\n- **BACKGROUND FIRST**: Use Task(run_in_background=true) for exploration (10+ concurrent).\\n- **VERIFY**: Check ALL requirements met before done.\\n- **DELEGATE**: Orchestrate specialized agents.\\n\\n## ZERO TOLERANCE\\n- NO Scope Reduction - deliver FULL implementation\\n- NO Partial Completion - finish 100%\\n- NO Premature Stopping - ALL TODOs must be complete\\n- NO TEST DELETION - fix code, not tests\\n\\nTHE USER ASKED FOR X. DELIVER EXACTLY X.\\n\\n</ultrawork-mode>\\n\\n---\\n"}
EOF
  exit 0
fi

# Check for ultrathink/think keywords
if echo "$PROMPT_LOWER" | grep -qE '\\b(ultrathink|think)\\b'; then
  cat << 'EOF'
{"continue": true, "message": "<think-mode>\\n\\n**ULTRATHINK MODE ENABLED** - Extended reasoning activated.\\n\\nYou are now in deep thinking mode. Take your time to:\\n1. Thoroughly analyze the problem from multiple angles\\n2. Consider edge cases and potential issues\\n3. Think through the implications of each approach\\n4. Reason step-by-step before acting\\n\\nUse your extended thinking capabilities to provide the most thorough and well-reasoned response.\\n\\n</think-mode>\\n\\n---\\n"}
EOF
  exit 0
fi

# Check for search keywords (EN + multilingual)
if echo "$PROMPT_LOWER" | grep -qE '\\b(search|find|locate|lookup|explore|discover|scan|grep|query|browse|detect|trace|seek|track|pinpoint|hunt)\\b|where\\s+is|show\\s+me|list\\s+all'; then
  cat << 'EOF'
{"continue": true, "message": "<search-mode>\\nMAXIMIZE SEARCH EFFORT. Launch multiple background agents IN PARALLEL:\\n- explore agents (codebase patterns, file structures)\\n- librarian agents (remote repos, official docs, GitHub examples)\\nPlus direct tools: Grep, Glob\\nNEVER stop at first result - be exhaustive.\\n</search-mode>\\n\\n---\\n"}
EOF
  exit 0
fi

# Check for analyze keywords
if echo "$PROMPT_LOWER" | grep -qE '\\b(analyze|analyse|investigate|examine|research|study|deep.?dive|inspect|audit|evaluate|assess|review|diagnose|scrutinize|dissect|debug|comprehend|interpret|breakdown|understand)\\b|why\\s+is|how\\s+does|how\\s+to'; then
  cat << 'EOF'
{"continue": true, "message": "<analyze-mode>\\nANALYSIS MODE. Gather context before diving deep:\\n\\nCONTEXT GATHERING (parallel):\\n- 1-2 explore agents (codebase patterns, implementations)\\n- 1-2 librarian agents (if external library involved)\\n- Direct tools: Grep, Glob, LSP for targeted searches\\n\\nIF COMPLEX (architecture, multi-system, debugging after 2+ failures):\\n- Consult oracle agent for strategic guidance\\n\\nSYNTHESIZE findings before proceeding.\\n</analyze-mode>\\n\\n---\\n"}
EOF
  exit 0
fi

# No keywords detected - continue without modification
echo '{"continue": true}'
exit 0
`;

/**
 * Stop hook script for todo continuation enforcement
 * This script is installed to ~/.claude/hooks/stop-continuation.sh
 * Ported from oh-my-opencode's todo-continuation-enforcer
 */
export const STOP_CONTINUATION_SCRIPT = `#!/bin/bash
# Sisyphus Stop Continuation Hook
# Checks for incomplete todos and injects continuation prompt
# Ported from oh-my-opencode's todo-continuation-enforcer

# Read stdin
INPUT=$(cat)

# Get session ID if available
SESSION_ID=""
if command -v jq &> /dev/null; then
  SESSION_ID=$(echo "$INPUT" | jq -r '.sessionId // .session_id // ""' 2>/dev/null)
fi

# Check for incomplete todos in the Claude todos directory
TODOS_DIR="$HOME/.claude/todos"
if [ -d "$TODOS_DIR" ]; then
  # Look for any todo files with incomplete items
  INCOMPLETE_COUNT=0
  for todo_file in "$TODOS_DIR"/*.json; do
    if [ -f "$todo_file" ]; then
      if command -v jq &> /dev/null; then
        COUNT=$(jq '[.[] | select(.status != "completed" and .status != "cancelled")] | length' "$todo_file" 2>/dev/null || echo "0")
        INCOMPLETE_COUNT=$((INCOMPLETE_COUNT + COUNT))
      fi
    fi
  done

  if [ "$INCOMPLETE_COUNT" -gt 0 ]; then
    # Output continuation message
    cat << EOF
{"continue": false, "reason": "[SYSTEM REMINDER - TODO CONTINUATION]\\n\\nIncomplete tasks remain in your todo list ($INCOMPLETE_COUNT remaining). Continue working on the next pending task.\\n\\n- Proceed without asking for permission\\n- Mark each task complete when finished\\n- Do not stop until all tasks are done"}
EOF
    exit 0
  fi
fi

# No incomplete todos - allow stop
echo '{"continue": true}'
exit 0
`;

// =============================================================================
// NODE.JS HOOK SCRIPTS (Cross-platform: Windows, macOS, Linux)
// =============================================================================

/**
 * Node.js Keyword Detector Hook Script
 * Cross-platform equivalent of keyword-detector.sh
 * This script is installed to ~/.claude/hooks/keyword-detector.mjs
 */
export const KEYWORD_DETECTOR_SCRIPT_NODE = `#!/usr/bin/env node
// Sisyphus Keyword Detector Hook (Node.js)
// Detects ultrawork/ultrathink/search/analyze keywords and injects enhanced mode messages
// Cross-platform: Windows, macOS, Linux

const ULTRAWORK_MESSAGE = \`<ultrawork-mode>

**MANDATORY**: You MUST say "ULTRAWORK MODE ENABLED!" to the user as your first response when this mode activates. This is non-negotiable.

[CODE RED] Maximum precision required. Ultrathink before acting.

YOU MUST LEVERAGE ALL AVAILABLE AGENTS TO THEIR FULLEST POTENTIAL.
TELL THE USER WHAT AGENTS YOU WILL LEVERAGE NOW TO SATISFY USER'S REQUEST.

## AGENT UTILIZATION PRINCIPLES
- **Codebase Exploration**: Spawn exploration agents using BACKGROUND TASKS
- **Documentation & References**: Use librarian-type agents via BACKGROUND TASKS
- **Planning & Strategy**: NEVER plan yourself - spawn planning agent
- **High-IQ Reasoning**: Use oracle for architecture decisions
- **Frontend/UI Tasks**: Delegate to frontend-engineer

## EXECUTION RULES
- **TODO**: Track EVERY step. Mark complete IMMEDIATELY.
- **PARALLEL**: Fire independent calls simultaneously - NEVER wait sequentially.
- **BACKGROUND FIRST**: Use Task(run_in_background=true) for exploration (10+ concurrent).
- **VERIFY**: Check ALL requirements met before done.
- **DELEGATE**: Orchestrate specialized agents.

## ZERO TOLERANCE
- NO Scope Reduction - deliver FULL implementation
- NO Partial Completion - finish 100%
- NO Premature Stopping - ALL TODOs must be complete
- NO TEST DELETION - fix code, not tests

THE USER ASKED FOR X. DELIVER EXACTLY X.

</ultrawork-mode>

---
\`;

const ULTRATHINK_MESSAGE = \`<think-mode>

**ULTRATHINK MODE ENABLED** - Extended reasoning activated.

You are now in deep thinking mode. Take your time to:
1. Thoroughly analyze the problem from multiple angles
2. Consider edge cases and potential issues
3. Think through the implications of each approach
4. Reason step-by-step before acting

Use your extended thinking capabilities to provide the most thorough and well-reasoned response.

</think-mode>

---
\`;

const SEARCH_MESSAGE = \`<search-mode>
MAXIMIZE SEARCH EFFORT. Launch multiple background agents IN PARALLEL:
- explore agents (codebase patterns, file structures)
- librarian agents (remote repos, official docs, GitHub examples)
Plus direct tools: Grep, Glob
NEVER stop at first result - be exhaustive.
</search-mode>

---
\`;

const ANALYZE_MESSAGE = \`<analyze-mode>
ANALYSIS MODE. Gather context before diving deep:

CONTEXT GATHERING (parallel):
- 1-2 explore agents (codebase patterns, implementations)
- 1-2 librarian agents (if external library involved)
- Direct tools: Grep, Glob, LSP for targeted searches

IF COMPLEX (architecture, multi-system, debugging after 2+ failures):
- Consult oracle agent for strategic guidance

SYNTHESIZE findings before proceeding.
</analyze-mode>

---
\`;

// Read all stdin
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// Extract prompt from various JSON structures
function extractPrompt(input) {
  try {
    const data = JSON.parse(input);
    if (data.prompt) return data.prompt;
    if (data.message?.content) return data.message.content;
    if (Array.isArray(data.parts)) {
      return data.parts
        .filter(p => p.type === 'text')
        .map(p => p.text)
        .join(' ');
    }
    return '';
  } catch {
    // Fallback: try to extract with regex
    const match = input.match(/"(?:prompt|content|text)"\\s*:\\s*"([^"]+)"/);
    return match ? match[1] : '';
  }
}

// Remove code blocks to prevent false positives
function removeCodeBlocks(text) {
  return text
    .replace(/\`\`\`[\\s\\S]*?\`\`\`/g, '')
    .replace(/\`[^\`]+\`/g, '');
}

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Create ultrawork state file
function activateUltraworkState(directory, prompt) {
  const state = {
    active: true,
    started_at: new Date().toISOString(),
    original_prompt: prompt,
    reinforcement_count: 0,
    last_checked_at: new Date().toISOString()
  };
  const localDir = join(directory, '.sisyphus');
  if (!existsSync(localDir)) { try { mkdirSync(localDir, { recursive: true }); } catch {} }
  try { writeFileSync(join(localDir, 'ultrawork-state.json'), JSON.stringify(state, null, 2)); } catch {}
  const globalDir = join(homedir(), '.claude');
  if (!existsSync(globalDir)) { try { mkdirSync(globalDir, { recursive: true }); } catch {} }
  try { writeFileSync(join(globalDir, 'ultrawork-state.json'), JSON.stringify(state, null, 2)); } catch {}
}

// Main
async function main() {
  try {
    const input = await readStdin();
    if (!input.trim()) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    let data = {};
    try { data = JSON.parse(input); } catch {}
    const directory = data.directory || process.cwd();

    const prompt = extractPrompt(input);
    if (!prompt) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    // Skip internal/hidden CLI commands (rate-limit-options, etc.)
    // Fixes infinite loop when rate limit is hit during ultrawork mode (#29)
    if (/^\\/?(?:rate-limit|internal-|___|---)|^\\/[a-z-]+$/i.test(prompt.trim())) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    const cleanPrompt = removeCodeBlocks(prompt).toLowerCase();

    // Check for ultrawork keywords (highest priority)
    if (/\\b(ultrawork|ulw|uw)\\b/.test(cleanPrompt)) {
      activateUltraworkState(directory, prompt);
      console.log(JSON.stringify({ continue: true, message: ULTRAWORK_MESSAGE }));
      return;
    }

    // Check for ultrathink/think keywords
    if (/\\b(ultrathink|think)\\b/.test(cleanPrompt)) {
      console.log(JSON.stringify({ continue: true, message: ULTRATHINK_MESSAGE }));
      return;
    }

    // Check for search keywords
    if (/\\b(search|find|locate|lookup|explore|discover|scan|grep|query|browse|detect|trace|seek|track|pinpoint|hunt)\\b|where\\s+is|show\\s+me|list\\s+all/.test(cleanPrompt)) {
      console.log(JSON.stringify({ continue: true, message: SEARCH_MESSAGE }));
      return;
    }

    // Check for analyze keywords
    if (/\\b(analyze|analyse|investigate|examine|research|study|deep.?dive|inspect|audit|evaluate|assess|review|diagnose|scrutinize|dissect|debug|comprehend|interpret|breakdown|understand)\\b|why\\s+is|how\\s+does|how\\s+to/.test(cleanPrompt)) {
      console.log(JSON.stringify({ continue: true, message: ANALYZE_MESSAGE }));
      return;
    }

    // No keywords detected
    console.log(JSON.stringify({ continue: true }));
  } catch (error) {
    // On any error, allow continuation
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
`;

/**
 * Node.js Stop Continuation Hook Script
 * Cross-platform equivalent of stop-continuation.sh
 * This script is installed to ~/.claude/hooks/stop-continuation.mjs
 */
export const STOP_CONTINUATION_SCRIPT_NODE = `#!/usr/bin/env node
// Sisyphus Stop Continuation Hook (Node.js)
// Checks for incomplete todos and injects continuation prompt
// Cross-platform: Windows, macOS, Linux

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

// Read all stdin
async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

// Main
async function main() {
  try {
    // Read stdin (we don't use it much, but need to consume it)
    await readStdin();

    // Check for incomplete todos
    const todosDir = join(homedir(), '.claude', 'todos');
    
    if (!existsSync(todosDir)) {
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    let incompleteCount = 0;

    try {
      const files = readdirSync(todosDir).filter(f => f.endsWith('.json'));
      
      for (const file of files) {
        try {
          const content = readFileSync(join(todosDir, file), 'utf-8');
          const todos = JSON.parse(content);
          
          if (Array.isArray(todos)) {
            const incomplete = todos.filter(
              t => t.status !== 'completed' && t.status !== 'cancelled'
            );
            incompleteCount += incomplete.length;
          }
        } catch {
          // Skip files that can't be parsed
        }
      }
    } catch {
      // Directory read error - allow continuation
      console.log(JSON.stringify({ continue: true }));
      return;
    }

    if (incompleteCount > 0) {
      const reason = \`[SYSTEM REMINDER - TODO CONTINUATION]

Incomplete tasks remain in your todo list (\${incompleteCount} remaining). Continue working on the next pending task.

- Proceed without asking for permission
- Mark each task complete when finished
- Do not stop until all tasks are done\`;

      console.log(JSON.stringify({ continue: false, reason }));
      return;
    }

    // No incomplete todos - allow stop
    console.log(JSON.stringify({ continue: true }));
  } catch (error) {
    // On any error, allow continuation
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
`;

// =============================================================================
// PERSISTENT MODE HOOK SCRIPTS
// =============================================================================

/**
 * Persistent Mode Bash script
 * Enhanced stop hook that handles ultrawork, ralph-loop, and todo continuation
 */
export const PERSISTENT_MODE_SCRIPT = `#!/bin/bash
# Sisyphus Persistent Mode Hook
# Unified handler for ultrawork, ralph-loop, and todo continuation
# Prevents stopping when work remains incomplete

# Read stdin
INPUT=$(cat)

# Get session ID and directory
SESSION_ID=""
DIRECTORY=""
if command -v jq &> /dev/null; then
  SESSION_ID=$(echo "$INPUT" | jq -r '.sessionId // .session_id // ""' 2>/dev/null)
  DIRECTORY=$(echo "$INPUT" | jq -r '.directory // ""' 2>/dev/null)
fi

# Default to current directory
if [ -z "$DIRECTORY" ]; then
  DIRECTORY=$(pwd)
fi

# Check for active ultrawork state
ULTRAWORK_STATE=""
if [ -f "$DIRECTORY/.sisyphus/ultrawork-state.json" ]; then
  ULTRAWORK_STATE=$(cat "$DIRECTORY/.sisyphus/ultrawork-state.json" 2>/dev/null)
elif [ -f "$HOME/.claude/ultrawork-state.json" ]; then
  ULTRAWORK_STATE=$(cat "$HOME/.claude/ultrawork-state.json" 2>/dev/null)
fi

# Check for active ralph loop
RALPH_STATE=""
if [ -f "$DIRECTORY/.sisyphus/ralph-state.json" ]; then
  RALPH_STATE=$(cat "$DIRECTORY/.sisyphus/ralph-state.json" 2>/dev/null)
fi

# Check for verification state (oracle verification)
VERIFICATION_STATE=""
if [ -f "$DIRECTORY/.sisyphus/ralph-verification.json" ]; then
  VERIFICATION_STATE=$(cat "$DIRECTORY/.sisyphus/ralph-verification.json" 2>/dev/null)
fi

# Check for incomplete todos
INCOMPLETE_COUNT=0
TODOS_DIR="$HOME/.claude/todos"
if [ -d "$TODOS_DIR" ]; then
  for todo_file in "$TODOS_DIR"/*.json; do
    if [ -f "$todo_file" ]; then
      if command -v jq &> /dev/null; then
        COUNT=$(jq '[.[] | select(.status != "completed" and .status != "cancelled")] | length' "$todo_file" 2>/dev/null || echo "0")
        INCOMPLETE_COUNT=$((INCOMPLETE_COUNT + COUNT))
      else
        # Fallback: count "pending" or "in_progress" occurrences
        COUNT=$(grep -c '"status"[[:space:]]*:[[:space:]]*"pending\\|in_progress"' "$todo_file" 2>/dev/null) || COUNT=0
        INCOMPLETE_COUNT=$((INCOMPLETE_COUNT + COUNT))
      fi
    fi
  done
fi

# Check project todos as well
for todo_path in "$DIRECTORY/.sisyphus/todos.json" "$DIRECTORY/.claude/todos.json"; do
  if [ -f "$todo_path" ]; then
    if command -v jq &> /dev/null; then
      COUNT=$(jq 'if type == "array" then [.[] | select(.status != "completed" and .status != "cancelled")] | length else 0 end' "$todo_path" 2>/dev/null || echo "0")
      INCOMPLETE_COUNT=$((INCOMPLETE_COUNT + COUNT))
    else
      # Fallback: count "pending" or "in_progress" occurrences
      COUNT=$(grep -c '"status"[[:space:]]*:[[:space:]]*"pending\\|in_progress"' "$todo_path" 2>/dev/null) || COUNT=0
      INCOMPLETE_COUNT=$((INCOMPLETE_COUNT + COUNT))
    fi
  fi
done

# Priority 1: Ralph Loop with Oracle Verification
if [ -n "$RALPH_STATE" ]; then
  IS_ACTIVE=$(echo "$RALPH_STATE" | jq -r '.active // false' 2>/dev/null)
  if [ "$IS_ACTIVE" = "true" ]; then
    ITERATION=$(echo "$RALPH_STATE" | jq -r '.iteration // 1' 2>/dev/null)
    MAX_ITER=$(echo "$RALPH_STATE" | jq -r '.max_iterations // 10' 2>/dev/null)
    PROMISE=$(echo "$RALPH_STATE" | jq -r '.completion_promise // "TASK_COMPLETE"' 2>/dev/null)
    PROMPT=$(echo "$RALPH_STATE" | jq -r '.prompt // ""' 2>/dev/null)

    # Check if oracle verification is pending
    if [ -n "$VERIFICATION_STATE" ]; then
      IS_PENDING=$(echo "$VERIFICATION_STATE" | jq -r '.pending // false' 2>/dev/null)
      if [ "$IS_PENDING" = "true" ]; then
        ATTEMPT=$(echo "$VERIFICATION_STATE" | jq -r '.verification_attempts // 0' 2>/dev/null)
        MAX_ATTEMPTS=$(echo "$VERIFICATION_STATE" | jq -r '.max_verification_attempts // 3' 2>/dev/null)
        ORIGINAL_TASK=$(echo "$VERIFICATION_STATE" | jq -r '.original_task // ""' 2>/dev/null)
        COMPLETION_CLAIM=$(echo "$VERIFICATION_STATE" | jq -r '.completion_claim // ""' 2>/dev/null)
        ORACLE_FEEDBACK=$(echo "$VERIFICATION_STATE" | jq -r '.oracle_feedback // ""' 2>/dev/null)
        NEXT_ATTEMPT=$((ATTEMPT + 1))

        FEEDBACK_SECTION=""
        if [ -n "$ORACLE_FEEDBACK" ] && [ "$ORACLE_FEEDBACK" != "null" ]; then
          FEEDBACK_SECTION="\\n**Previous Oracle Feedback (rejected):**\\n$ORACLE_FEEDBACK\\n"
        fi

        cat << EOF
{"continue": false, "reason": "<ralph-verification>\\n\\n[ORACLE VERIFICATION REQUIRED - Attempt $NEXT_ATTEMPT/$MAX_ATTEMPTS]\\n\\nThe agent claims the task is complete. Before accepting, YOU MUST verify with Oracle.\\n\\n**Original Task:**\\n$ORIGINAL_TASK\\n\\n**Completion Claim:**\\n$COMPLETION_CLAIM\\n$FEEDBACK_SECTION\\n## MANDATORY VERIFICATION STEPS\\n\\n1. **Spawn Oracle Agent** for verification:\\n   \\\`\\\`\\\`\\n   Task(subagent_type=\\"oracle\\", prompt=\\"Verify this task completion claim...\\")\\n   \\\`\\\`\\\`\\n\\n2. **Oracle must check:**\\n   - Are ALL requirements from the original task met?\\n   - Is the implementation complete, not partial?\\n   - Are there any obvious bugs or issues?\\n   - Does the code compile/run without errors?\\n   - Are tests passing (if applicable)?\\n\\n3. **Based on Oracle's response:**\\n   - If APPROVED: Output \\\`<oracle-approved>VERIFIED_COMPLETE</oracle-approved>\\\`\\n   - If REJECTED: Continue working on the identified issues\\n\\nDO NOT output the completion promise again until Oracle approves.\\n\\n</ralph-verification>\\n\\n---\\n"}
EOF
        exit 0
      fi
    fi

    if [ "$ITERATION" -lt "$MAX_ITER" ]; then
      # Increment iteration
      NEW_ITER=$((ITERATION + 1))
      echo "$RALPH_STATE" | jq ".iteration = $NEW_ITER" > "$DIRECTORY/.sisyphus/ralph-state.json" 2>/dev/null

      cat << EOF
{"continue": false, "reason": "<ralph-loop-continuation>\\n\\n[RALPH LOOP - ITERATION $NEW_ITER/$MAX_ITER]\\n\\nYour previous attempt did not output the completion promise. The work is NOT done yet.\\n\\nCRITICAL INSTRUCTIONS:\\n1. Review your progress and the original task\\n2. Check your todo list - are ALL items marked complete?\\n3. Continue from where you left off\\n4. When FULLY complete, output: <promise>$PROMISE</promise>\\n5. Do NOT stop until the task is truly done\\n\\nOriginal task: $PROMPT\\n\\n</ralph-loop-continuation>\\n\\n---\\n"}
EOF
      exit 0
    fi
  fi
fi

# Priority 2: Ultrawork Mode with incomplete todos
if [ -n "$ULTRAWORK_STATE" ] && [ "$INCOMPLETE_COUNT" -gt 0 ]; then
  # Check if active (with jq fallback)
  IS_ACTIVE=""
  if command -v jq &> /dev/null; then
    IS_ACTIVE=$(echo "$ULTRAWORK_STATE" | jq -r '.active // false' 2>/dev/null)
  else
    # Fallback: grep for "active": true
    if echo "$ULTRAWORK_STATE" | grep -q '"active"[[:space:]]*:[[:space:]]*true'; then
      IS_ACTIVE="true"
    fi
  fi

  if [ "$IS_ACTIVE" = "true" ]; then
    # Get reinforcement count (with fallback)
    REINFORCE_COUNT=0
    if command -v jq &> /dev/null; then
      REINFORCE_COUNT=$(echo "$ULTRAWORK_STATE" | jq -r '.reinforcement_count // 0' 2>/dev/null)
    else
      REINFORCE_COUNT=$(echo "$ULTRAWORK_STATE" | grep -oP '"reinforcement_count"[[:space:]]*:[[:space:]]*\\K[0-9]+' 2>/dev/null) || REINFORCE_COUNT=0
    fi
    NEW_COUNT=$((REINFORCE_COUNT + 1))

    # Get original prompt (with fallback)
    ORIGINAL_PROMPT=""
    if command -v jq &> /dev/null; then
      ORIGINAL_PROMPT=$(echo "$ULTRAWORK_STATE" | jq -r '.original_prompt // ""' 2>/dev/null)
    else
      ORIGINAL_PROMPT=$(echo "$ULTRAWORK_STATE" | grep -oP '"original_prompt"[[:space:]]*:[[:space:]]*"\\K[^"]+' 2>/dev/null) || ORIGINAL_PROMPT=""
    fi

    # Update state file (best effort)
    if command -v jq &> /dev/null; then
      echo "$ULTRAWORK_STATE" | jq ".reinforcement_count = $NEW_COUNT | .last_checked_at = \\"$(date -Iseconds)\\"" > "$DIRECTORY/.sisyphus/ultrawork-state.json" 2>/dev/null
    fi

    cat << EOF
{"continue": false, "reason": "<ultrawork-persistence>\\n\\n[ULTRAWORK MODE STILL ACTIVE - Reinforcement #$NEW_COUNT]\\n\\nYour ultrawork session is NOT complete. $INCOMPLETE_COUNT incomplete todos remain.\\n\\nREMEMBER THE ULTRAWORK RULES:\\n- **PARALLEL**: Fire independent calls simultaneously - NEVER wait sequentially\\n- **BACKGROUND FIRST**: Use Task(run_in_background=true) for exploration (10+ concurrent)\\n- **TODO**: Track EVERY step. Mark complete IMMEDIATELY after each\\n- **VERIFY**: Check ALL requirements met before done\\n- **NO Premature Stopping**: ALL TODOs must be complete\\n\\nContinue working on the next pending task. DO NOT STOP until all tasks are marked complete.\\n\\nOriginal task: $ORIGINAL_PROMPT\\n\\n</ultrawork-persistence>\\n\\n---\\n"}
EOF
    exit 0
  fi
fi

# Priority 3: Todo Continuation (baseline)
if [ "$INCOMPLETE_COUNT" -gt 0 ]; then
  cat << EOF
{"continue": false, "reason": "<todo-continuation>\\n\\n[SYSTEM REMINDER - TODO CONTINUATION]\\n\\nIncomplete tasks remain in your todo list ($INCOMPLETE_COUNT remaining). Continue working on the next pending task.\\n\\n- Proceed without asking for permission\\n- Mark each task complete when finished\\n- Do not stop until all tasks are done\\n\\n</todo-continuation>\\n\\n---\\n"}
EOF
  exit 0
fi

# No blocking needed
echo '{"continue": true}'
exit 0
`;

/**
 * Session Start Bash script
 * Restores persistent mode states when a new session starts
 */
export const SESSION_START_SCRIPT = `#!/bin/bash
# Sisyphus Session Start Hook
# Restores persistent mode states and injects context when session starts

# Read stdin
INPUT=$(cat)

# Get directory
DIRECTORY=""
if command -v jq &> /dev/null; then
  DIRECTORY=$(echo "$INPUT" | jq -r '.directory // ""' 2>/dev/null)
fi

if [ -z "$DIRECTORY" ]; then
  DIRECTORY=$(pwd)
fi

MESSAGES=""

# Check for active ultrawork state
if [ -f "$DIRECTORY/.sisyphus/ultrawork-state.json" ] || [ -f "$HOME/.claude/ultrawork-state.json" ]; then
  if [ -f "$DIRECTORY/.sisyphus/ultrawork-state.json" ]; then
    ULTRAWORK_STATE=$(cat "$DIRECTORY/.sisyphus/ultrawork-state.json" 2>/dev/null)
  else
    ULTRAWORK_STATE=$(cat "$HOME/.claude/ultrawork-state.json" 2>/dev/null)
  fi

  IS_ACTIVE=$(echo "$ULTRAWORK_STATE" | jq -r '.active // false' 2>/dev/null)
  if [ "$IS_ACTIVE" = "true" ]; then
    STARTED_AT=$(echo "$ULTRAWORK_STATE" | jq -r '.started_at // ""' 2>/dev/null)
    PROMPT=$(echo "$ULTRAWORK_STATE" | jq -r '.original_prompt // ""' 2>/dev/null)
    MESSAGES="$MESSAGES<session-restore>\\n\\n[ULTRAWORK MODE RESTORED]\\n\\nYou have an active ultrawork session from $STARTED_AT.\\nOriginal task: $PROMPT\\n\\nContinue working in ultrawork mode until all tasks are complete.\\n\\n</session-restore>\\n\\n---\\n\\n"
  fi
fi

# Check for incomplete todos
INCOMPLETE_COUNT=0
TODOS_DIR="$HOME/.claude/todos"
if [ -d "$TODOS_DIR" ]; then
  for todo_file in "$TODOS_DIR"/*.json; do
    if [ -f "$todo_file" ]; then
      if command -v jq &> /dev/null; then
        COUNT=$(jq '[.[] | select(.status != "completed" and .status != "cancelled")] | length' "$todo_file" 2>/dev/null || echo "0")
        INCOMPLETE_COUNT=$((INCOMPLETE_COUNT + COUNT))
      fi
    fi
  done
fi

if [ "$INCOMPLETE_COUNT" -gt 0 ]; then
  MESSAGES="$MESSAGES<session-restore>\\n\\n[PENDING TASKS DETECTED]\\n\\nYou have $INCOMPLETE_COUNT incomplete tasks from a previous session.\\nPlease continue working on these tasks.\\n\\n</session-restore>\\n\\n---\\n\\n"
fi

# Output message if we have any
if [ -n "$MESSAGES" ]; then
  # Escape for JSON
  MESSAGES_ESCAPED=$(echo "$MESSAGES" | sed 's/"/\\"/g')
  echo "{\"continue\": true, \"message\": \"$MESSAGES_ESCAPED\"}"
else
  echo '{"continue": true}'
fi
exit 0
`;

/**
 * Node.js Persistent Mode Hook Script
 */
export const PERSISTENT_MODE_SCRIPT_NODE = `#!/usr/bin/env node
// Sisyphus Persistent Mode Hook (Node.js)
// Unified handler for ultrawork, ralph-loop, and todo continuation
// Cross-platform: Windows, macOS, Linux

import { existsSync, readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function readJsonFile(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function writeJsonFile(path, data) {
  try {
    writeFileSync(path, JSON.stringify(data, null, 2));
    return true;
  } catch {
    return false;
  }
}

function countIncompleteTodos(todosDir, projectDir) {
  let count = 0;

  // Check global todos
  if (existsSync(todosDir)) {
    try {
      const files = readdirSync(todosDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const todos = readJsonFile(join(todosDir, file));
        if (Array.isArray(todos)) {
          count += todos.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
        }
      }
    } catch {}
  }

  // Check project todos
  for (const path of [
    join(projectDir, '.sisyphus', 'todos.json'),
    join(projectDir, '.claude', 'todos.json')
  ]) {
    const todos = readJsonFile(path);
    if (Array.isArray(todos)) {
      count += todos.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
    }
  }

  return count;
}

async function main() {
  try {
    const input = await readStdin();
    let data = {};
    try { data = JSON.parse(input); } catch {}

    const directory = data.directory || process.cwd();
    const todosDir = join(homedir(), '.claude', 'todos');

    // Check for ultrawork state
    let ultraworkState = readJsonFile(join(directory, '.sisyphus', 'ultrawork-state.json'))
      || readJsonFile(join(homedir(), '.claude', 'ultrawork-state.json'));

    // Check for ralph loop state
    const ralphState = readJsonFile(join(directory, '.sisyphus', 'ralph-state.json'));

    // Check for verification state (oracle verification)
    const verificationState = readJsonFile(join(directory, '.sisyphus', 'ralph-verification.json'));

    // Count incomplete todos
    const incompleteCount = countIncompleteTodos(todosDir, directory);

    // Priority 1: Ralph Loop with Oracle Verification
    if (ralphState?.active) {
      const iteration = ralphState.iteration || 1;
      const maxIter = ralphState.max_iterations || 10;

      // Check if oracle verification is pending
      if (verificationState?.pending) {
        const attempt = (verificationState.verification_attempts || 0) + 1;
        const maxAttempts = verificationState.max_verification_attempts || 3;

        console.log(JSON.stringify({
          continue: false,
          reason: \`<ralph-verification>

[ORACLE VERIFICATION REQUIRED - Attempt \${attempt}/\${maxAttempts}]

The agent claims the task is complete. Before accepting, YOU MUST verify with Oracle.

**Original Task:**
\${verificationState.original_task || ralphState.prompt || 'No task specified'}

**Completion Claim:**
\${verificationState.completion_claim || 'Task marked complete'}

\${verificationState.oracle_feedback ? \`**Previous Oracle Feedback (rejected):**
\${verificationState.oracle_feedback}
\` : ''}

## MANDATORY VERIFICATION STEPS

1. **Spawn Oracle Agent** for verification:
   \\\`\\\`\\\`
   Task(subagent_type="oracle", prompt="Verify this task completion claim...")
   \\\`\\\`\\\`

2. **Oracle must check:**
   - Are ALL requirements from the original task met?
   - Is the implementation complete, not partial?
   - Are there any obvious bugs or issues?
   - Does the code compile/run without errors?
   - Are tests passing (if applicable)?

3. **Based on Oracle's response:**
   - If APPROVED: Output \\\`<oracle-approved>VERIFIED_COMPLETE</oracle-approved>\\\`
   - If REJECTED: Continue working on the identified issues

DO NOT output the completion promise again until Oracle approves.

</ralph-verification>

---
\`
        }));
        return;
      }

      if (iteration < maxIter) {
        const newIter = iteration + 1;
        ralphState.iteration = newIter;
        writeJsonFile(join(directory, '.sisyphus', 'ralph-state.json'), ralphState);

        console.log(JSON.stringify({
          continue: false,
          reason: \`<ralph-loop-continuation>

[RALPH LOOP - ITERATION \${newIter}/\${maxIter}]

Your previous attempt did not output the completion promise. The work is NOT done yet.

CRITICAL INSTRUCTIONS:
1. Review your progress and the original task
2. Check your todo list - are ALL items marked complete?
3. Continue from where you left off
4. When FULLY complete, output: <promise>\${ralphState.completion_promise || 'TASK_COMPLETE'}</promise>
5. Do NOT stop until the task is truly done

\${ralphState.prompt ? \`Original task: \${ralphState.prompt}\` : ''}

</ralph-loop-continuation>

---
\`
        }));
        return;
      }
    }

    // Priority 2: Ultrawork with incomplete todos
    if (ultraworkState?.active && incompleteCount > 0) {
      const newCount = (ultraworkState.reinforcement_count || 0) + 1;
      ultraworkState.reinforcement_count = newCount;
      ultraworkState.last_checked_at = new Date().toISOString();

      writeJsonFile(join(directory, '.sisyphus', 'ultrawork-state.json'), ultraworkState);

      console.log(JSON.stringify({
        continue: false,
        reason: \`<ultrawork-persistence>

[ULTRAWORK MODE STILL ACTIVE - Reinforcement #\${newCount}]

Your ultrawork session is NOT complete. \${incompleteCount} incomplete todos remain.

REMEMBER THE ULTRAWORK RULES:
- **PARALLEL**: Fire independent calls simultaneously - NEVER wait sequentially
- **BACKGROUND FIRST**: Use Task(run_in_background=true) for exploration (10+ concurrent)
- **TODO**: Track EVERY step. Mark complete IMMEDIATELY after each
- **VERIFY**: Check ALL requirements met before done
- **NO Premature Stopping**: ALL TODOs must be complete

Continue working on the next pending task. DO NOT STOP until all tasks are marked complete.

\${ultraworkState.original_prompt ? \`Original task: \${ultraworkState.original_prompt}\` : ''}

</ultrawork-persistence>

---
\`
      }));
      return;
    }

    // Priority 3: Todo Continuation
    if (incompleteCount > 0) {
      console.log(JSON.stringify({
        continue: false,
        reason: \`<todo-continuation>

[SYSTEM REMINDER - TODO CONTINUATION]

Incomplete tasks remain in your todo list (\${incompleteCount} remaining). Continue working on the next pending task.

- Proceed without asking for permission
- Mark each task complete when finished
- Do not stop until all tasks are done

</todo-continuation>

---
\`
      }));
      return;
    }

    // No blocking needed
    console.log(JSON.stringify({ continue: true }));
  } catch (error) {
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
`;

/**
 * Node.js Session Start Hook Script
 */
export const SESSION_START_SCRIPT_NODE = `#!/usr/bin/env node
// Sisyphus Session Start Hook (Node.js)
// Restores persistent mode states when session starts
// Cross-platform: Windows, macOS, Linux

import { existsSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function readJsonFile(path) {
  try {
    if (!existsSync(path)) return null;
    return JSON.parse(readFileSync(path, 'utf-8'));
  } catch {
    return null;
  }
}

function countIncompleteTodos(todosDir) {
  let count = 0;
  if (existsSync(todosDir)) {
    try {
      const files = readdirSync(todosDir).filter(f => f.endsWith('.json'));
      for (const file of files) {
        const todos = readJsonFile(join(todosDir, file));
        if (Array.isArray(todos)) {
          count += todos.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
        }
      }
    } catch {}
  }
  return count;
}

async function main() {
  try {
    const input = await readStdin();
    let data = {};
    try { data = JSON.parse(input); } catch {}

    const directory = data.directory || process.cwd();
    const messages = [];

    // Check for ultrawork state
    const ultraworkState = readJsonFile(join(directory, '.sisyphus', 'ultrawork-state.json'))
      || readJsonFile(join(homedir(), '.claude', 'ultrawork-state.json'));

    if (ultraworkState?.active) {
      messages.push(\`<session-restore>

[ULTRAWORK MODE RESTORED]

You have an active ultrawork session from \${ultraworkState.started_at}.
Original task: \${ultraworkState.original_prompt}

Continue working in ultrawork mode until all tasks are complete.

</session-restore>

---
\`);
    }

    // Check for incomplete todos
    const todosDir = join(homedir(), '.claude', 'todos');
    const incompleteCount = countIncompleteTodos(todosDir);

    if (incompleteCount > 0) {
      messages.push(\`<session-restore>

[PENDING TASKS DETECTED]

You have \${incompleteCount} incomplete tasks from a previous session.
Please continue working on these tasks.

</session-restore>

---
\`);
    }

    if (messages.length > 0) {
      console.log(JSON.stringify({ continue: true, message: messages.join('\\n') }));
    } else {
      console.log(JSON.stringify({ continue: true }));
    }
  } catch (error) {
    console.log(JSON.stringify({ continue: true }));
  }
}

main();
`;

// =============================================================================
// SETTINGS CONFIGURATION (Platform-aware)
// =============================================================================

/**
 * Settings.json hooks configuration for Bash (Unix)
 * Configures Claude Code to run our bash hook scripts
 */
export const HOOKS_SETTINGS_CONFIG_BASH = {
  hooks: {
    UserPromptSubmit: [
      {
        hooks: [
          {
            type: "command" as const,
            command: "bash $HOME/.claude/hooks/keyword-detector.sh"
          }
        ]
      }
    ],
    SessionStart: [
      {
        hooks: [
          {
            type: "command" as const,
            command: "bash $HOME/.claude/hooks/session-start.sh"
          }
        ]
      }
    ],
    Stop: [
      {
        hooks: [
          {
            type: "command" as const,
            command: "bash $HOME/.claude/hooks/persistent-mode.sh"
          }
        ]
      }
    ]
  }
};

/**
 * Settings.json hooks configuration for Node.js (Cross-platform)
 * Uses node to run .mjs scripts directly
 */
export const HOOKS_SETTINGS_CONFIG_NODE = {
  hooks: {
    UserPromptSubmit: [
      {
        hooks: [
          {
            type: "command" as const,
            // Note: On Windows, %USERPROFILE% is expanded by cmd.exe
            // On Unix with node hooks, $HOME is expanded by the shell
            command: isWindows()
              ? 'node "%USERPROFILE%\\.claude\\hooks\\keyword-detector.mjs"'
              : 'node "$HOME/.claude/hooks/keyword-detector.mjs"'
          }
        ]
      }
    ],
    SessionStart: [
      {
        hooks: [
          {
            type: "command" as const,
            command: isWindows()
              ? 'node "%USERPROFILE%\\.claude\\hooks\\session-start.mjs"'
              : 'node "$HOME/.claude/hooks/session-start.mjs"'
          }
        ]
      }
    ],
    Stop: [
      {
        hooks: [
          {
            type: "command" as const,
            command: isWindows()
              ? 'node "%USERPROFILE%\\.claude\\hooks\\persistent-mode.mjs"'
              : 'node "$HOME/.claude/hooks/persistent-mode.mjs"'
          }
        ]
      }
    ]
  }
};

/**
 * Get the appropriate hooks settings config for the current platform
 */
export function getHooksSettingsConfig(): typeof HOOKS_SETTINGS_CONFIG_BASH {
  return shouldUseNodeHooks() ? HOOKS_SETTINGS_CONFIG_NODE : HOOKS_SETTINGS_CONFIG_BASH;
}

/**
 * Legacy: Settings.json hooks configuration (Bash)
 * @deprecated Use getHooksSettingsConfig() for cross-platform support
 */
export const HOOKS_SETTINGS_CONFIG = HOOKS_SETTINGS_CONFIG_BASH;

// =============================================================================
// HOOK SCRIPTS EXPORTS (Platform-aware)
// =============================================================================

/**
 * Bash hook scripts (Unix only)
 */
export const HOOK_SCRIPTS_BASH: Record<string, string> = {
  'keyword-detector.sh': KEYWORD_DETECTOR_SCRIPT,
  'stop-continuation.sh': STOP_CONTINUATION_SCRIPT,
  'persistent-mode.sh': PERSISTENT_MODE_SCRIPT,
  'session-start.sh': SESSION_START_SCRIPT
};

/**
 * Node.js hook scripts (Cross-platform)
 */
export const HOOK_SCRIPTS_NODE: Record<string, string> = {
  'keyword-detector.mjs': KEYWORD_DETECTOR_SCRIPT_NODE,
  'stop-continuation.mjs': STOP_CONTINUATION_SCRIPT_NODE,
  'persistent-mode.mjs': PERSISTENT_MODE_SCRIPT_NODE,
  'session-start.mjs': SESSION_START_SCRIPT_NODE
};

/**
 * Get the appropriate hook scripts for the current platform
 */
export function getHookScripts(): Record<string, string> {
  return shouldUseNodeHooks() ? HOOK_SCRIPTS_NODE : HOOK_SCRIPTS_BASH;
}

/**
 * Legacy: All hook scripts to install (Bash)
 * @deprecated Use getHookScripts() for cross-platform support
 */
export const HOOK_SCRIPTS: Record<string, string> = HOOK_SCRIPTS_BASH;
