# Model Aliases Configuration Guide

> Since v4.6.0 — Remap agent model tiers without changing agent definitions.

## Overview

Model Aliases let you override which actual model each tier name (`haiku`, `sonnet`, `opus`) resolves to. This is useful when:

- You want all `sonnet` agents to use a different model (e.g., `opus`)
- You're using a non-Claude provider and need to remap tier names
- You want to test different models without editing every agent definition

## Configuration

### Via `omc-config.json`

Add `modelAliases` under the `routing` section:

```json
{
  "routing": {
    "modelAliases": {
      "haiku": "sonnet",
      "sonnet": "opus"
    }
  }
}
```

**Supported alias keys:** `haiku`, `sonnet`, `opus`

**Supported alias values:** `haiku`, `sonnet`, `opus`, `inherit`

- Setting a tier to `inherit` means the agent will inherit the parent session's model instead of injecting a specific one. This is essential for non-Claude providers where tier names like `sonnet` would cause 400 errors.

### Via Environment Variables

```bash
# Override individual tiers
export OMC_MODEL_ALIAS_HAIKU=sonnet
export OMC_MODEL_ALIAS_SONNET=opus
export OMC_MODEL_ALIAS_OPUS=opus
```

Environment variables take precedence over config file settings.

## How It Works

The resolution priority for an agent's model is:

1. **Explicit parameter** — If a model is explicitly passed to the agent, it wins
2. **Model Aliases** — Config/env aliases remap the agent's default tier
3. **Agent Default** — The tier defined in the agent definition

### Example Flow

```
Agent definition: model = "sonnet"
Config alias:     sonnet → opus
Result:           Agent runs with opus
```

### `inherit` Mode

When an alias resolves to `inherit`, OMC strips the model parameter entirely, letting the agent inherit whatever model the parent session is using:

```json
{
  "routing": {
    "modelAliases": {
      "haiku": "inherit",
      "sonnet": "inherit",
      "opus": "inherit"
    }
  }
}
```

This is particularly useful for:
- **Non-Claude providers** (OpenAI, Gemini, etc.) where `sonnet`/`opus` tier names don't exist
- **Unified model runs** where you want every agent to use the same model

## Per-Agent Model Override

For more granular control, you can set models per agent type in the agent definitions rather than using global aliases. Model aliases are best for broad, config-level remapping.

## Examples

### Force all agents to use Opus

```json
{
  "routing": {
    "modelAliases": {
      "haiku": "opus",
      "sonnet": "opus"
    }
  }
}
```

### Use with non-Claude provider

```bash
export OMC_MODEL_ALIAS_HAIKU=inherit
export OMC_MODEL_ALIAS_SONNET=inherit
export OMC_MODEL_ALIAS_OPUS=inherit
```

### Cost optimization (downgrade all to Haiku)

```json
{
  "routing": {
    "modelAliases": {
      "sonnet": "haiku",
      "opus": "haiku"
    }
  }
}
```

---

*Contributed by: 스피키 (speaki) — content draft | 개발가재 (gaebal-gajae) — review & PR*
