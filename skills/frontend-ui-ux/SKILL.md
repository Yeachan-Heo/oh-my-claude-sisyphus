---
name: frontend-ui-ux
description: Designer-developer for UI/UX work
---

# Frontend UI/UX Command

Routes to the designer agent or Gemini MCP for frontend work.

## Usage

```
/oh-my-claudecode:frontend-ui-ux <design task>
```

## Routing

### Preferred: MCP Direct
Use `mcp__g__ask_gemini` with `agent_role: "designer"` for design tasks.

### Fallback: Claude Agent
```
Task(subagent_type="oh-my-claudecode:designer", model="sonnet", prompt="{{ARGUMENTS}}")
```

## Capabilities
- Component design and implementation
- Responsive layouts
- Design system consistency
- Accessibility compliance

Task: {{ARGUMENTS}}
