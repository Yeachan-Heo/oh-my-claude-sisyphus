---
description: Start self-referential development loop until task completion
---

[RALPH LOOP ACTIVATED - INFINITE PERSISTENCE MODE]

$ARGUMENTS

## THE RALPH OATH

You have entered the Ralph Loop - an INESCAPABLE development cycle that binds you to your task until VERIFIED completion. There is no early exit. There is no giving up. The only way out is through.

## PHASE 0: TDD Decision (FIRST STEP)

**Before starting, ASK the user:**

> "Do you want to use TDD (Test-Driven Development) for this task?"
> - **Yes**: Start with Phase 1 (Hephaestus creates tests first)
> - **No**: Skip to Phase 2 (Direct implementation)

**When to recommend TDD:**
- New features with clear acceptance criteria
- Bug fixes that need regression tests
- Refactoring where behavior must be preserved

**When TDD may not be needed:**
- Simple config changes
- Documentation updates
- Trivial one-line fixes
- Exploratory prototyping

## How The Loop Works

**With TDD (Yes):**
1. **PHASE 1: TEST FIRST** - Create tests from acceptance criteria (Hephaestus)
2. **PHASE 2: IMPLEMENT** - Make all tests pass (sisyphus-junior, oracle, frontend-engineer)
3. **PHASE 3: VERIFY** - Confirm completion and determine next action

**Without TDD (No):**
1. ~~PHASE 1: Skipped~~
2. **PHASE 2: IMPLEMENT** - Direct implementation
3. **PHASE 3: VERIFY** - Run existing tests + Oracle review

4. **PROMISE COMPLETION** - ONLY output `<promise>DONE</promise>` when 100% verified
5. **AUTO-CONTINUATION** - If you stop without the promise, YOU WILL BE REMINDED TO CONTINUE

## The Three Phases

### PHASE 1: Test Scaffolding (Hephaestus)

Before ANY implementation, create the tests that will guide development.

```
Task(subagent_type="hephaestus", prompt="
Create test scaffold for: [describe the feature]
Work plan location: .sisyphus/plans/[plan-name].md
")
```

**Phase 1 Exit Criteria:**
- [ ] All acceptance criteria have corresponding tests
- [ ] All tests FAIL (expected - nothing implemented yet)
- [ ] Test files follow project conventions

### PHASE 2: Implementation

Now implement the functionality to make tests pass.

**Use these agents:**
- **sisyphus-junior**: Direct implementation
- **oracle**: Architecture guidance (READ-ONLY)
- **frontend-engineer**: UI/UX work

**Phase 2 Exit Criteria:**
- [ ] All tests pass
- [ ] No build errors
- [ ] Code follows project conventions

### PHASE 3: Verification

Run tests and Oracle review to determine next action.

| Verification Result | Action |
|---------------------|--------|
| All tests pass + Oracle approves | Output `<promise>DONE</promise>` |
| Tests fail - implementation bug | → Return to PHASE 2 |
| Tests fail - test is wrong | → Return to PHASE 1 |
| Missing test coverage | → Return to PHASE 1 |

## The Promise Mechanism

The `<promise>DONE</promise>` tag is a SACRED CONTRACT. You may ONLY output it when:

✓ PHASE 1: Tests exist for all acceptance criteria
✓ PHASE 2: All tests pass
✓ PHASE 3: Oracle has approved the implementation
✓ ALL todo items are marked 'completed'
✓ You have VERIFIED (not assumed) completion

**LYING IS DETECTED**: If you output the promise prematurely, your incomplete work will be exposed and you will be forced to continue.

## Exit Conditions

| Condition | What Happens |
|-----------|--------------|
| `<promise>DONE</promise>` | Loop ends - work verified complete |
| User runs `/cancel-ralph` | Loop cancelled by user |
| Max iterations (100) | Safety limit reached |
| Stop without promise | **CONTINUATION FORCED** |

## Continuation Enforcement

If you attempt to stop without the promise tag:

> [RALPH LOOP CONTINUATION] You stopped without completing your promise. The task is NOT done. Continue working on incomplete items. Do not stop until you can truthfully output `<promise>DONE</promise>`.

## Working Style

1. **Start with PHASE 1** - Create tests from plan before implementation
2. **Execute Systematically** - One phase at a time, verify each
3. **Delegate to Specialists** - Use subagents for specialized work
4. **Parallelize When Possible** - Multiple agents for independent tasks
5. **Verify Before Promising** - Test everything before the promise

## The Ralph Verification Checklist

Before outputting `<promise>DONE</promise>`, verify:

- [ ] Todo list shows 100% completion
- [ ] All tests exist (PHASE 1 complete)
- [ ] All tests pass (PHASE 2 complete)
- [ ] Oracle has approved (PHASE 3 complete)
- [ ] User's original request is FULLY addressed
- [ ] No obvious bugs or issues remain

**If ANY checkbox is unchecked, DO NOT output the promise. Continue working.**

## VERIFICATION PROTOCOL (MANDATORY)

**You CANNOT declare task complete without proper verification.**

### Step 1: Oracle Review
```
Task(subagent_type="oracle", prompt="VERIFY COMPLETION:
Original task: [describe the task]
What I implemented: [list changes]
Tests run: [test results]

Please verify:
1. Is implementation complete and correct?
2. If tests fail, is it an IMPLEMENTATION bug or a TEST bug?
3. Are there any issues I missed?")
```

### Step 2: Runtime Verification (Choose ONE)

**Option A: Standard Test Suite (PREFERRED)**
If the project has tests (npm test, pytest, cargo test, etc.):
```bash
npm test  # or pytest, go test, etc.
```
Use this when existing tests cover the functionality.

**Option B: QA-Tester (ONLY when needed)**
Use qa-tester ONLY when ALL of these apply:
- ✗ No existing test suite covers the behavior
- ✓ Requires interactive CLI input/output
- ✓ Needs service startup/shutdown verification
- ✓ Tests streaming, real-time, or tmux-specific behavior

```
Task(subagent_type="qa-tester", prompt="VERIFY BEHAVIOR: ...")
```

**Gating Rule**: If `npm test` (or equivalent) passes, you do NOT need qa-tester.

### Step 3: Based on Verification Results
- **If Oracle APPROVED + Tests PASS**: Output `<promise>DONE</promise>`
- **If tests fail (implementation bug)**: Return to PHASE 2
- **If tests fail (test bug)**: Return to PHASE 1
- **If any REJECTED/FAILED**: Fix issues and re-verify

**NO PROMISE WITHOUT VERIFICATION.**

---

Begin working on the task now. Start with PHASE 1 (Hephaestus). The loop will not release you until you earn your `<promise>DONE</promise>`.
