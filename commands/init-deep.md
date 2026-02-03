---
name: init-deep
description: Initialize hierarchical AGENTS.md knowledge base across codebase
argument-hint: [--update] [--validate] [path]
---

# /init-deep Command

Generate comprehensive, hierarchical AGENTS.md documentation across the entire codebase. Creates AI-readable documentation that helps agents understand project structure.

## Usage

```
/oh-my-claudecode:init-deep
/oh-my-claudecode:init-deep --update
/oh-my-claudecode:init-deep --validate
/oh-my-claudecode:init-deep src/
```

## Arguments

- `[path]` - Optional path to initialize (default: current directory)
- `--update` - Update existing AGENTS.md files, preserving manual sections
- `--validate` - Only validate existing hierarchy, don't generate

## What It Does

1. **Maps Directory Structure**
   - Scans all directories recursively
   - Excludes: node_modules, .git, dist, build, **pycache**, .venv

2. **Creates Work Plan**
   - Organizes directories by depth level
   - Parents generated before children (ensures valid references)

3. **Generates AGENTS.md Files**
   - Purpose description for each directory
   - Key files with descriptions
   - Subdirectory listings
   - AI agent instructions
   - Testing requirements
   - Common patterns

4. **Validates Hierarchy**
   - Checks parent references resolve
   - Identifies orphaned files
   - Verifies completeness

## AGENTS.md Template

Each generated file includes:

```markdown
<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2024-01-15 | Updated: 2024-01-15 -->

# Directory Name

## Purpose

What this directory contains and its role.

## Key Files

| File    | Description |
| ------- | ----------- |
| file.ts | Purpose     |

## Subdirectories

| Directory | Purpose          |
| --------- | ---------------- |
| subdir/   | What it contains |

## For AI Agents

### Working In This Directory

Special instructions for modifications.

### Testing Requirements

How to test changes.

### Common Patterns

Code patterns used.

## Dependencies

### Internal

References to other codebase parts.

### External

Key packages/libraries.

<!-- MANUAL: Notes preserved on regeneration -->
```

## Examples

**Full initialization:**

```
/oh-my-claudecode:init-deep
```

Creates AGENTS.md for every directory in the project.

**Update existing:**

```
/oh-my-claudecode:init-deep --update
```

Updates AGENTS.md files while preserving `<!-- MANUAL: -->` sections.

**Validate only:**

```
/oh-my-claudecode:init-deep --validate
```

Checks hierarchy without modifying files.

**Specific directory:**

```
/oh-my-claudecode:init-deep src/components/
```

Initializes only the specified subtree.

## Parallelization

The command uses parallel execution:

- Same-level directories processed in parallel
- Different levels processed sequentially (parent first)
- Large directories get dedicated agents
- Small directories batched together

## Agent Delegation

| Task               | Agent                 |
| ------------------ | --------------------- |
| Directory mapping  | explore (haiku)       |
| File analysis      | architect-low (haiku) |
| Content generation | writer (haiku)        |
| AGENTS.md writes   | writer (haiku)        |

## Quality Checks

After generation:

- [ ] All parent references resolve
- [ ] No orphaned AGENTS.md files
- [ ] All directories covered
- [ ] Timestamps current
- [ ] File descriptions accurate

## See Also

- `/oh-my-claudecode:deepsearch` - Search with context
- `/oh-my-claudecode:analyze` - Deep analysis
