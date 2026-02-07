---
name: analyze
description: Deep analysis and investigation
---

# Analyze Command

Routes to the architect agent or Codex MCP for deep analysis.

## Usage

```
/oh-my-claudecode:analyze <topic or question>
```

## Routing

This command delegates analysis work. It does NOT contain workflow logic.

### Preferred: MCP Direct
Use `mcp__x__ask_codex` with `agent_role: "architect"` for analysis tasks.

### Fallback: Claude Agent
```
Task(subagent_type="oh-my-claudecode:architect", model="opus", prompt="Analyze: {{ARGUMENTS}}")
```

## When to Use
- Architecture analysis
- Bug investigation
- Performance debugging
- Dependency analysis

Task: {{ARGUMENTS}}
