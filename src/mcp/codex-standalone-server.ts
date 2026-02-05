/**
 * Standalone Codex MCP Server
 *
 * Thin wrapper around codex-core that provides stdio MCP transport.
 * Built into bridge/codex-server.cjs for .mcp.json registration.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  CODEX_VALID_ROLES,
  CODEX_DEFAULT_MODEL,
  handleAskCodex,
} from './codex-core.js';

const askCodexTool = {
  name: 'ask_codex',
  description: `Send a prompt to OpenAI Codex CLI for analytical/planning tasks. Codex excels at architecture review, planning validation, critical analysis, and code/security review validation. Requires agent_role to specify the perspective (${CODEX_VALID_ROLES.join(', ')}). Requires Codex CLI (npm install -g @openai/codex).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      agent_role: {
        type: 'string',
        enum: CODEX_VALID_ROLES,
        description: `Required. Agent perspective for Codex: ${CODEX_VALID_ROLES.join(', ')}. Codex is optimized for analytical/planning tasks.`
      },
      prompt_file: { type: 'string', description: 'Path to file containing the prompt (alternative to prompt parameter)' },
      output_file: { type: 'string', description: 'Path to write response. If CLI doesn\'t write here, stdout is written to {output_file}.raw' },
      context_files: { type: 'array', items: { type: 'string' }, description: 'File paths to include as context (contents will be prepended to prompt)' },
      prompt: { type: 'string', description: 'The prompt to send to Codex' },
      model: { type: 'string', description: `Codex model to use (default: ${CODEX_DEFAULT_MODEL}). Set OMC_CODEX_DEFAULT_MODEL env var to change default.` },
      background: { type: 'boolean', description: 'Run in background (non-blocking). Returns immediately with job metadata and file paths. Check response file for completion.' },
    },
    required: ['agent_role'],
  },
};

const server = new Server(
  { name: 'x', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [askCodexTool],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (name !== 'ask_codex') {
    return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
  }
  const { prompt, prompt_file, output_file, agent_role, model, context_files, background } = (args ?? {}) as {
    prompt?: string;
    prompt_file?: string;
    output_file?: string;
    agent_role: string;
    model?: string;
    context_files?: string[];
    background?: boolean;
  };
  return handleAskCodex({ prompt, prompt_file, output_file, agent_role, model, context_files, background });
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Codex MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start Codex server:', error);
  process.exit(1);
});
