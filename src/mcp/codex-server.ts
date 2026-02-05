/**
 * Codex MCP Server - In-process MCP server for OpenAI Codex CLI integration
 *
 * Exposes `ask_codex` tool via the Claude Agent SDK's createSdkMcpServer helper.
 * Tools will be available as mcp__x__ask_codex
 *
 * Note: The standalone version (codex-standalone-server.ts) is used for the
 * external-process .mcp.json registration with proper stdio transport.
 */

import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { handleAskCodex, CODEX_DEFAULT_MODEL, CODEX_VALID_ROLES } from './codex-core.js';

// Define the ask_codex tool using the SDK tool() helper
const askCodexTool = tool(
  "ask_codex",
  `Send a prompt to OpenAI Codex CLI for analytical/planning tasks. Codex excels at architecture review, planning validation, critical analysis, and code/security review validation. Requires agent_role to specify the perspective (${CODEX_VALID_ROLES.join(', ')}). Requires Codex CLI (npm install -g @openai/codex).`,
  {
    agent_role: { type: "string", description: `Required. Agent perspective for Codex: ${CODEX_VALID_ROLES.join(', ')}. Codex is optimized for analytical/planning tasks.` },
    prompt_file: { type: "string", description: "Path to file containing the prompt (alternative to prompt parameter)" },
    output_file: { type: "string", description: "Path to write response. If CLI doesn't write here, stdout is written to {output_file}.raw" },
    context_files: { type: "array", items: { type: "string" }, description: "File paths to include as context (contents will be prepended to prompt)" },
    prompt: { type: "string", description: "The prompt to send to Codex" },
    model: { type: "string", description: `Codex model to use (default: ${CODEX_DEFAULT_MODEL}). Set OMC_CODEX_DEFAULT_MODEL env var to change default.` },
    background: { type: "boolean", description: "Run in background (non-blocking). Returns immediately with job metadata and file paths. Check response file for completion." },
  } as any,
  async (args: any) => {
    const { prompt, prompt_file, output_file, agent_role, model, context_files, background } = args as {
      prompt?: string;
      prompt_file?: string;
      output_file?: string;
      agent_role: string;
      model?: string;
      context_files?: string[];
      background?: boolean;
    };
    return handleAskCodex({ prompt, prompt_file, output_file, agent_role, model, context_files, background });
  }
);

/**
 * In-process MCP server exposing Codex CLI integration
 *
 * Tools will be available as mcp__x__ask_codex
 */
export const codexMcpServer = createSdkMcpServer({
  name: "x",
  version: "1.0.0",
  tools: [askCodexTool]
});

/**
 * Tool names for allowedTools configuration
 */
export const codexToolNames = ['ask_codex'];
