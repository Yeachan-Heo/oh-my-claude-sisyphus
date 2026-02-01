---
description: Fix build and TypeScript errors with minimal changes
---

# Build Fix

[BUILD FIX MODE ACTIVATED]

## Objective

Resolve build and TypeScript errors quickly with minimal code changes. Get the build green without refactoring or architectural changes.

## What Gets Fixed

- **TypeScript Errors** - Type mismatches, missing annotations, inference failures
- **Import Errors** - Module resolution, missing packages
- **Build Failures** - Compilation errors, configuration issues
- **Linter Errors** - ESLint violations blocking the build

## Workflow

1. Run the project's type check command (e.g., `tsc --noEmit`, `mypy`, `cargo check`) to collect all errors
2. Categorize errors by type
3. Fix errors one at a time with minimal changes
4. Verify fix doesn't introduce new errors
5. Repeat until build passes

## Stop Conditions

The agent stops when:
- The type check command exits with code 0
- The project's build command completes successfully
- No new errors are introduced

## Minimal Diff Strategy

The agent will:
- Add type annotations where missing
- Add null checks where needed
- Fix import/export statements
- NOT refactor unrelated code
- NOT change architecture
- NOT optimize performance

## Invocation

This command delegates to the `build-fixer` agent (Sonnet model) for efficient error resolution.

## Output

A build error resolution report with:
- List of errors fixed
- Lines changed per fix
- Final build status
- Verification steps completed
