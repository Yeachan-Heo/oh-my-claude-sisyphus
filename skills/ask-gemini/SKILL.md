---
name: ask-gemini
description: Ask Gemini via local CLI and capture a reusable artifact
---

# Ask Gemini

Use Gemini as an external advisor through OMC's ask command.

## Usage

```bash
/oh-my-claudecode:ask-gemini <question or task>
```

## Routing

Preferred path:

```bash
omc ask gemini "{{ARGUMENTS}}"
```

Wrapper alias (compatibility):

```bash
npm run ask:gemini -- "{{ARGUMENTS}}"
# or
./scripts/ask-gemini.sh "{{ARGUMENTS}}"
```

## Requirements

- Local Gemini CLI must be installed and authenticated.
- Verify with:

```bash
gemini --version
```

## Artifacts

`omc ask` writes artifacts to:

```text
.omc/artifacts/ask/gemini-<slug>-<timestamp>.md
```

Task: {{ARGUMENTS}}
