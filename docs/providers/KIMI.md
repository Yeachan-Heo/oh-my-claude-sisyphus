
# Kimi Provider

The Kimi provider allows `oh-my-claudecode` to delegate tasks to the Kimi-CLI, an AI agent from Moonshot AI. This is useful for leveraging Kimi's large context window and strong bilingual (English/Chinese) capabilities.

## Configuration

This provider is enabled automatically if the `kimi` CLI is detected in your system's `PATH`.

- **Installation:** `curl -LsSf https://code.kimi.com/install.sh | bash`
- **Homepage:** [https://github.com/MoonshotAI/kimi-cli](https://github.com/MoonshotAI/kimi-cli)
- **First Run:** You must run `kimi` once and use the `/login` command to authenticate before this provider can be used.

## Tools

The Kimi provider exposes the following tool under the `mcp__ki__` prefix.

### `ask_kimi`

Sends a prompt to the Kimi-CLI for a one-shot response. This is useful for code generation, analysis, or getting a different perspective on a problem.

**Parameters:**
- `prompt` (string, required): The prompt to send to Kimi.
- `files` (array, optional): A list of file paths to include as context. Their contents will be prepended to the prompt.
- `model` (string, optional): The Kimi model to use (e.g., 'moonshot-v1-8k').
- `working_directory` (string, optional): The working directory for file path resolution.

**Example:**
```
<tool_code>
mcp__ki__ask_kimi(
  prompt="Translate the following Python code to idiomatic TypeScript.",
  files=["src/utils/helpers.py"]
)
</tool_code>
```

## Use Case: Code Translation & Analysis

Kimi is particularly strong at understanding and translating code between languages, and its large context window makes it effective for analyzing entire files.

```
<tool_code>
mcp__ki__ask_kimi(
  prompt="Based on the context from the package.json and the main entrypoint file, what is the primary purpose of this application? Identify any potential performance bottlenecks.",
  files=["package.json", "src/index.ts"]
)
</tool_code>
```
