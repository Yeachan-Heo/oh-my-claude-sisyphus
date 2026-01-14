# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.3.0] - 2026-01-14

### Added
- **`/chillwork` skill** - Cost-optimized mode as counterpart to `/ultrawork`
  - Defaults to LOW tier agents (`-low` variants) instead of MEDIUM
  - Same parallelization as default mode (up to 5 concurrent agents)
  - Same delegation patterns - just cheaper models
  - Escalates to higher tiers only when needed (security, complex debugging)
  - Magic keywords: `chillwork`, `budget`, `cheap`

### Changed
- Updated skill tables in docs/CLAUDE.md with chillwork
- Updated README with chillwork documentation
- Added `chillwork` to plugin keywords and tags

---

## [2.0.1] - 2026-01-13

### Added
- **Vitest test framework** with comprehensive test suite (231 tests)
  - Model routing tests (100 tests)
  - Hook system tests (78 tests)
  - Skill activation tests (15 tests)
  - Installer validation tests (28 tests)
- **Windows native support improvements**
  - Cross-platform command detection (which → where on Windows)
  - Platform-aware auto-update with graceful Windows handling
  - Fixed Unix-only shell redirects

### Changed
- Synced shell script installer with TypeScript installer
- Removed deprecated orchestrator command from shell script
- Removed separate skills directory (now via commands only)

### Fixed
- Cross-platform `which` command replaced with platform-aware detection
- Auto-update now handles Windows gracefully with helpful error message
- Shell script command count matches TypeScript installer (11 commands)
- **Agent frontmatter** - Added missing `name` and `description` fields to all 11 agents
  - Per Claude Code sub-agent specification requirements

---

## [2.0.0-beta.2] - 2026-01-13

### 🧪 New: QA-Tester Agent for Interactive Testing

**Added tmux-based interactive testing capabilities for CLI/service verification.**

### Added
- **QA-Tester Agent** (`src/agents/qa-tester.ts`)
  - Interactive CLI testing using tmux sessions
  - Prerequisite checking (tmux availability, server connections)
  - Structured test execution workflow
  - Oracle → QA-Tester diagnostic loop pattern

- **Smart Gating for qa-tester** in ultrawork/skills
  - Prefer standard test suites over qa-tester when available
  - Use qa-tester only when interactive testing is truly needed
  - Token-efficient verification decisions

- **Adaptive Routing for qa-tester**
  - Simple verification → Haiku
  - Interactive testing → Sonnet
  - Complex integration → Opus

### Changed
- Updated ultrawork skill with verification protocol and qa-tester gating
- Updated ralph-loop and orchestrator with qa-tester integration
- Updated sisyphus command with Agent Combinations section

### Refactored
- **Merged sisyphus+orchestrator+ultrawork into default mode** - 80% behavior overlap consolidated
  - Default mode is now an intelligent orchestrator
  - `/orchestrator` command deprecated (use default mode or `/ultrawork`)
  - Skill composition replaces agent swapping
- **Removed deprecated orchestrator command** - Deleted `commands/orchestrator.md` and `orchestratorSkill` (1352 lines)
- **Updated attribution** - Changed from "Port of" to "Inspired by" oh-my-opencode (70% divergence)

### Fixed
- **Migrated to ESLint v9 flat config** - Created `eslint.config.js` for modern ESLint
- **Resolved all 50 lint warnings** - Removed unused imports, fixed prefer-const, updated re-exports
- Synced installer COMMAND_DEFINITIONS with updated skills
- Handle malformed settings.json gracefully in install.sh

---

## [2.0.0-beta.1] - 2026-01-13

### 🚀 Revolutionary: Intelligent Model Routing

**This is a major release introducing adaptive model routing for all agents.**

The orchestrator (Opus) now analyzes task complexity BEFORE delegation and routes to the appropriate model tier (Haiku/Sonnet/Opus). This dramatically improves efficiency - simple tasks use faster, cheaper models while complex tasks get the full power of Opus.

### Added
- **Intelligent Model Routing System** (`src/features/model-routing/`)
  - `types.ts`: Core types for routing (ComplexityTier, RoutingDecision, etc.)
  - `signals.ts`: Complexity signal extraction (lexical, structural, context)
  - `scorer.ts`: Weighted scoring system for complexity calculation
  - `rules.ts`: Priority-based routing rules engine
  - `router.ts`: Main routing logic with `getModelForTask()` API
  - `prompts/`: Tier-specific prompt adaptations (opus.ts, sonnet.ts, haiku.ts)

- **Adaptive Routing for ALL Agents**
  - Only orchestrators are fixed to Opus (they analyze and delegate)
  - All other agents adapt based on task complexity:
    - `oracle`: lookup → Haiku, tracing → Sonnet, debugging → Opus
    - `prometheus`: breakdown → Haiku, planning → Sonnet, strategic → Opus
    - `momus`: checklist → Haiku, gap analysis → Sonnet, adversarial → Opus
    - `metis`: impact → Haiku, deps → Sonnet, risk analysis → Opus
    - `explore`: simple search → Haiku, complex → Sonnet
    - `document-writer`: simple docs → Haiku, complex → Sonnet
    - `sisyphus-junior`: simple fix → Haiku, module work → Sonnet, risky → Opus

- **Complexity Signal Detection**
  - Lexical: word count, keywords (architecture, debugging, risk, simple)
  - Structural: subtask count, cross-file deps, impact scope, reversibility
  - Context: previous failures, conversation depth, plan complexity

- **Tiered Prompt Adaptations**
  - Haiku: Concise, direct prompts for speed
  - Sonnet: Balanced prompts for efficiency
  - Opus: Deep reasoning prompts with thinking mode

### Changed
- **Orchestrator Prompts** updated with intelligent routing guidance
- **Configuration** (`src/config/loader.ts`) now includes routing options
- **Types** (`src/shared/types.ts`) extended with routing configuration

### Breaking Changes
- Routing is now proactive (orchestrator decides upfront) instead of reactive
- Deprecated `routeWithEscalation()` - use `getModelForTask()` instead

### Migration Guide
No action needed - the system automatically routes based on complexity. To override:
```typescript
Task(subagent_type="oracle", model="opus", prompt="Force Opus for this task")
```

---

## [1.11.0] - 2026-01-13

### Added
- **Enhanced Hook Enforcement System** - Stronger Sisyphus behavior enforcement beyond CLAUDE.md
  - `pre-tool-enforcer.sh`: PreToolUse hook that injects contextual Sisyphus reminders before every tool execution
  - `post-tool-verifier.sh`: PostToolUse hook for verification after tools, with failure detection
  - Enhanced `persistent-mode.sh`: Stop hook now includes build/test/git/background task verification
  - `claude-sisyphus.sh`: CLI wrapper that uses `--append-system-prompt` for direct system prompt injection
  - `sisyphus-aliases.sh`: Shell aliases (`claude-s`, `claudew`) for easy activation

### Changed
- **Stop Hook** now enforces additional verification requirements:
  - Build verification (if build scripts exist)
  - Test verification (if tests exist)
  - Git status check (warns on uncommitted changes)
  - Background task completion check
  - All previous checks (Ralph Loop, Ultrawork, Todo completion)

- **Hook Configuration** - Added PreToolUse and PostToolUse to `hooks.json`

### Technical Details
- PreToolUse hook provides tool-specific reminders (Bash, Task, Edit, Write, Read, Grep/Glob)
- PostToolUse hook tracks session statistics in `~/.claude/.session-stats.json`
- Stop hook returns `continue: false` until ALL verification requirements are met
- CLI wrapper appends core Sisyphus rules directly to Claude's system prompt

### Enforcement Hierarchy
1. **Stop Hook** with `continue: false` - Blocks ALL stopping until verified
2. **PreToolUse** - Injects reminders BEFORE every tool
3. **PostToolUse** - Verifies AFTER every tool
4. **CLI Wrapper** - Appends rules to system prompt

## [1.10.0] - 2026-01-11

### Added
- **Persistent Mode System** - Enhanced hook system for auto-continuation
  - `ultrawork-state` module: Manages persistent ultrawork mode state across sessions
  - `persistent-mode` hook: Unified Stop handler for ultrawork, ralph-loop, and todo continuation
  - `session-start` hook: Restores persistent mode states when a new session starts
  - Three-layer priority enforcement: Ralph Loop > Ultrawork > Todo Continuation

- **Claude Code Native Hooks Integration**
  - SessionStart hook for mode restoration on session resume
  - Enhanced Stop hook with persistent mode detection
  - Cross-platform support (Bash for Unix, Node.js for Windows)

- **Popular Plugin Patterns Module** (`plugin-patterns`)
  - Auto-format support for multiple languages (TypeScript, Python, Go, Rust)
  - Lint validation with language-specific linters
  - Conventional commit message validation
  - TypeScript type checking integration
  - Test runner detection and execution
  - Pre-commit validation workflow

### Changed
- **Bridge Module** - Added persistent-mode and session-start hook handlers
- **Keyword Detector** - Now activates ultrawork state when ultrawork keyword is detected
- **Settings Configuration** - Added SessionStart hook configuration for both Bash and Node.js

### Technical Details
- New hooks: `persistent-mode.sh/.mjs`, `session-start.sh/.mjs`
- State files: `.sisyphus/ultrawork-state.json`, `~/.claude/ultrawork-state.json`
- Ultrawork mode now persists across stop attempts when todos remain incomplete
- Ralph-loop continues with iteration tracking and reinforcement messages

## [1.9.0] - 2026-01-10

### Changed
- **Synced all builtin skills with oh-my-opencode source implementation**
  - Updated `orchestrator` skill (1302 lines) with complete orchestrator-sisyphus.ts template
  - Updated `sisyphus` skill (362 lines) with complete sisyphus.ts template
  - Updated `ultrawork` skill (97 lines) - cleaned and adapted from keyword-detector
  - Updated `ralph-loop` skill (11 lines) from ralph-loop hook
  - Updated `git-master` skill with 1131-line comprehensive template
  - Updated `frontend-ui-ux` skill with enhanced Work Principles section

### Fixed
- **Installer improvements**
  - Fixed skill path format from `'skill-name.md'` to `'skill-name/skill.md'`
  - Fixed agent path for prometheus from `'prometheus/skill.md'` to `'prometheus.md'`
  - Added directory creation for both commands and skills to prevent ENOENT errors
  - Fixed ultrawork skill to remove JavaScript wrapper code (clean prompt only)

- **Template escaping**
  - Properly escaped backticks, template literals (`${}`), and backslashes in all skill templates
  - Fixed TypeScript compilation errors due to improper template string escaping

- **SDK adaptation**
  - Converted all oh-my-opencode SDK patterns to Claude Code SDK:
    - `sisyphus_task()` → `Task(subagent_type=...)`
    - `background_output()` → `TaskOutput()`
    - References to OhMyOpenCode → Oh-My-ClaudeCode-Sisyphus

### Verified
- All 6 builtin skills install correctly to `~/.claude/skills/`
- Orchestrator skill properly delegates with `Task(subagent_type=...)`
- Ultrawork skill contains clean verification guarantees and zero-tolerance failures
- Build completes without TypeScript errors
- Installation completes successfully

## [1.8.0] - 2026-01-10

### Added
- Intelligent Skill Composition with task-type routing
- Architecture comparison documentation (OpenCode vs Claude Code)
- Intelligent Skill Activation section to README

### Changed
- Merged feature/auto-skill-routing branch

## [1.7.0] - Previous Release

### Added
- Windows support with Node.js hooks
- ESM import for tmpdir

---

[1.11.0]: https://github.com/Yeachan-Heo/oh-my-claude-sisyphus/compare/v1.10.0...v1.11.0
[1.10.0]: https://github.com/Yeachan-Heo/oh-my-claude-sisyphus/compare/v1.9.0...v1.10.0
[1.9.0]: https://github.com/Yeachan-Heo/oh-my-claude-sisyphus/compare/v1.8.0...v1.9.0
[1.8.0]: https://github.com/Yeachan-Heo/oh-my-claude-sisyphus/compare/v1.7.0...v1.8.0
[1.7.0]: https://github.com/Yeachan-Heo/oh-my-claude-sisyphus/releases/tag/v1.7.0
