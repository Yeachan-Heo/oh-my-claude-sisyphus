---
name: refactor
description: Intelligent refactoring with LSP, AST-grep, architecture analysis, and TDD verification
argument-hint: <target> [options]
---

# /refactor Command

Invoke the refactoring skill to safely restructure code using LSP tools, AST-grep patterns, architecture consultation, and TDD verification.

## Usage

```
/oh-my-claudecode:refactor <target> [options]
```

## Arguments

- `<target>` - What to refactor (symbol, file, pattern, or description)

## Examples

**Rename a symbol:**

```
/oh-my-claudecode:refactor rename userService to authService
```

**Extract a function:**

```
/oh-my-claudecode:refactor extract calculateTotal from OrderProcessor into pricing module
```

**Apply pattern transformation:**

```
/oh-my-claudecode:refactor convert all callback patterns to async/await in src/api/
```

**Restructure modules:**

```
/oh-my-claudecode:refactor reorganize src/utils into domain-specific modules
```

**General refactoring:**

```
/oh-my-claudecode:refactor improve the authentication flow in src/auth/
```

## What Happens

1. **Analysis** - Gathers context using explore agent and LSP tools
2. **Architecture Consultation** - Gets design recommendations from architect
3. **Planning** - Creates ordered refactoring steps with verification points
4. **Execution** - Applies changes using LSP rename, AST-grep, or targeted edits
5. **Verification** - Runs LSP diagnostics and tests after each step

## Options

The command automatically detects the refactoring type:

| Keyword      | Refactoring Type                     |
| ------------ | ------------------------------------ |
| `rename`     | LSP-powered symbol rename            |
| `extract`    | Extract function/module              |
| `move`       | Relocate symbol to different file    |
| `convert`    | Pattern transformation with AST-grep |
| `reorganize` | Structural reorganization            |
| `inline`     | Inline function/variable             |

## Safety Features

- **Pre-flight checks** - Verifies no existing errors before starting
- **Incremental verification** - Tests after each step
- **Automatic rollback** - Reverts on failure
- **LSP validation** - Uses LSP to ensure safe renames

## See Also

- `/oh-my-claudecode:build-fix` - Fix build errors
- `/oh-my-claudecode:code-review` - Review code quality
- `/oh-my-claudecode:tdd` - Test-driven development
