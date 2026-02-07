
/**
 * Kimi MCP Server - In-process MCP server for Kimi-CLI integration
 */

import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import {
  KIMI_DEFAULT_MODEL,
  runKimiPrompt
} from './kimi-core.js';

const askKimiTool = tool(
  "ask_kimi",
  "Send a prompt to Kimi-CLI for analysis or code generation. Kimi has a large context window and is strong in both English and Chinese.",
  {
    prompt: { type: "string", description: "The prompt to send to Kimi." },
    files: { type: "array", items: { type: "string" }, description: "File paths to include as context." },
    model: { type: "string", description: `Kimi model to use (default: ${KIMI_DEFAULT_MODEL}).` },
    working_directory: { type: "string", description: "Working directory for path resolution." },
  } as any,
  async (args: any) => {
    const result = await runKimiPrompt(args);
    // Wrap the result in the format expected by the SDK
    return { content: [{ type: 'text', text: result.result || result.error || 'No response from Kimi.' }] };
  }
);

/**
 * In-process MCP server exposing Kimi-CLI integration
 */
export const kimiMcpServer = createSdkMcpServer({
  name: "ki",
  version: "1.0.0",
  tools: [askKimiTool]
});

/**
 * Tool names for allowedTools configuration
 */
export const kimiToolNames = ['ask_kimi'];
