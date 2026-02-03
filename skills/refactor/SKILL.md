---
name: refactor
description: Intelligent refactoring with LSP, AST-grep, architecture analysis, codemap, and TDD verification
triggers:
  - "refactor"
  - "restructure"
  - "reorganize code"
  - "improve code structure"
---

# Refactor Skill

Intelligent refactoring command that leverages LSP tools, AST-grep for structural analysis, architecture consultation, codemap generation, and TDD verification to ensure safe, comprehensive refactoring.

## Overview

This skill provides a comprehensive refactoring workflow inspired by oh-my-opencode's refactor command. It combines multiple analysis tools and verification steps to ensure refactoring is:

- **Safe** - LSP rename/references ensure all usages are updated
- **Structural** - AST-grep finds and transforms patterns accurately
- **Verified** - TDD ensures behavior is preserved
- **Architecture-aware** - Consults architect for design decisions

## When to Use

Activate this skill when:

- User says "refactor", "restructure", "reorganize"
- Code needs systematic improvement
- Renaming symbols across the codebase
- Extracting functions/modules
- Applying design patterns
- Improving code organization

## Workflow

### Phase 1: Analysis

1. **Gather Context**

   ```
   delegate_task(subagent_type="explore", run_in_background=true,
     prompt="Find all code related to [target]. Map dependencies, usages, and patterns.")
   ```

2. **Architecture Consultation**

   ```
   delegate_task(subagent_type="oh-my-claudecode:architect",
     prompt="Analyze [target] for refactoring. Identify:
     - Current structure and problems
     - Recommended refactoring approach
     - Potential risks and breaking changes
     - Suggested order of operations")
   ```

3. **Generate Codemap**
   - Use `lsp_document_symbols` to get file outlines
   - Use `lsp_find_references` to map symbol usages
   - Use `ast_grep_search` to find structural patterns

### Phase 2: Planning

4. **Create Refactoring Plan**
   - List all changes needed with file:line locations
   - Order changes to avoid breaking dependencies
   - Identify test files that need updating
   - Mark high-risk changes for extra verification

5. **Pre-flight Checks**
   - Run `lsp_diagnostics_directory` to ensure no existing errors
   - Run existing tests to establish baseline
   - Identify tests covering refactored code

### Phase 3: Execution

6. **Execute Refactoring Steps**
   For each step in the plan:

   **For Symbol Renames:**

   ```
   lsp_prepare_rename(file, line, character)  # Verify rename is valid
   lsp_rename(file, line, character, newName)  # Preview changes
   # Apply changes with Edit tool
   ```

   **For Structural Changes:**

   ```
   ast_grep_search(pattern="...", language="typescript")  # Find patterns
   ast_grep_replace(pattern="...", replacement="...", dryRun=true)  # Preview
   ast_grep_replace(pattern="...", replacement="...", dryRun=false)  # Apply
   ```

   **For Complex Refactoring:**

   ```
   delegate_task(subagent_type="oh-my-claudecode:executor-high",
     prompt="Execute refactoring step: [description]
     Requirements:
     - Only modify files listed
     - Preserve behavior exactly
     - Update imports/exports as needed")
   ```

7. **Incremental Verification**
   After each step:
   - Run `lsp_diagnostics` on modified files
   - Run affected tests
   - Abort and rollback if failures

### Phase 4: Verification

8. **Full Test Suite**

   ```
   Bash(command="npm test" or "pytest" or equivalent)
   ```

9. **Final LSP Check**

   ```
   lsp_diagnostics_directory(directory=".", strategy="auto")
   ```

10. **Architecture Review**
    ```
    delegate_task(subagent_type="oh-my-claudecode:architect-medium",
      prompt="Review completed refactoring:
      - Does new structure match intended design?
      - Any remaining code smells?
      - Documentation needs updating?")
    ```

## LSP Tools Used

| Tool                        | Purpose in Refactoring          |
| --------------------------- | ------------------------------- |
| `lsp_goto_definition`       | Understand symbol origins       |
| `lsp_find_references`       | Map all usages before changes   |
| `lsp_prepare_rename`        | Validate rename is safe         |
| `lsp_rename`                | Preview rename across workspace |
| `lsp_document_symbols`      | Get file structure              |
| `lsp_workspace_symbols`     | Search symbols project-wide     |
| `lsp_diagnostics`           | Verify no errors after changes  |
| `lsp_diagnostics_directory` | Full project verification       |
| `lsp_code_actions`          | Get available refactorings      |

## AST-Grep Patterns

Common refactoring patterns:

**Rename Function Calls:**

```
pattern: "oldFunction($$$ARGS)"
replacement: "newFunction($$$ARGS)"
```

**Convert var to const:**

```
pattern: "var $NAME = $VALUE"
replacement: "const $NAME = $VALUE"
```

**Convert callback to async/await:**

```
pattern: "$FN($$$ARGS, ($ERR, $RESULT) => { $$$BODY })"
replacement: "const $RESULT = await $FN($$$ARGS)"
```

**Extract interface from object:**

```
pattern: "const $NAME: { $$$PROPS } = $VALUE"
# Generates interface and updates declaration
```

## Refactoring Types

### 1. Rename Symbol

Safe rename across entire codebase using LSP rename.

### 2. Extract Function/Method

Pull code into a new function while preserving behavior.

### 3. Extract Module

Move related code to a new file with proper exports.

### 4. Inline Function

Replace function calls with the function body.

### 5. Move Symbol

Relocate a function/class to a different file.

### 6. Change Signature

Modify function parameters across all call sites.

### 7. Convert Pattern

Transform code patterns (e.g., callbacks to promises).

## Safety Checks

Before each change:

- [ ] LSP confirms symbol is renameable
- [ ] All references are identified
- [ ] Tests exist for affected code
- [ ] No existing diagnostic errors

After each change:

- [ ] LSP diagnostics pass
- [ ] Affected tests pass
- [ ] No new errors introduced

## Example Usage

**Simple rename:**

```
/refactor rename userService to authService
```

**Extract function:**

```
/refactor extract calculateTotal from OrderProcessor into pricing module
```

**Apply pattern:**

```
/refactor convert all callback patterns to async/await in src/api/
```

**Full restructure:**

```
/refactor reorganize src/utils into domain-specific modules
```

## Error Handling

If refactoring fails:

1. **Rollback** - Undo all changes from current step
2. **Report** - Show what failed and why
3. **Suggest** - Recommend manual intervention if needed

```
REFACTORING FAILED
==================
Step: Rename userService → authService
Error: 3 references in node_modules cannot be updated

Recommendation:
- This symbol is used by external dependencies
- Consider creating an alias instead of renaming
- Or update package exports to use new name
```

## Output Format

```
REFACTORING COMPLETE
====================

Target: userService → authService

Changes Applied:
- Renamed symbol in 15 files (47 references)
- Updated imports in 8 files
- Updated exports in 2 files
- Updated tests in 3 files

Verification:
- LSP Diagnostics: ✓ 0 errors
- Tests: ✓ 142 passed, 0 failed
- Build: ✓ Success

Files Modified:
1. src/services/authService.ts (renamed from userService.ts)
2. src/api/routes/auth.ts
3. src/components/Login.tsx
... (12 more files)

Architecture Notes:
- New structure follows clean architecture principles
- Consider adding facade for backward compatibility
```

## Integration with Other Skills

**With Ralph (persistence):**

```
/ralph refactor the entire authentication module
```

Keeps working until refactoring is complete and verified.

**With Ultrawork (parallelism):**

```
/ultrawork refactor all deprecated API calls
```

Parallel refactoring across multiple files.

**With TDD:**

```
/tdd refactor OrderCalculator with tests first
```

Write tests before refactoring to ensure behavior preserved.

## Best Practices

1. **Small steps** - Refactor incrementally, verify after each step
2. **Tests first** - Ensure tests exist before refactoring
3. **One thing at a time** - Don't mix refactoring with features
4. **Commit often** - Small commits make rollback easier
5. **Review diffs** - Verify changes match intent before applying
