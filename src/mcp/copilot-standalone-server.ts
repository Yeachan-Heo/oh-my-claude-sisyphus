/**
 * Standalone Copilot MCP Server
 *
 * Thin wrapper around copilot-core that provides stdio MCP transport.
 * Built into bridge/copilot-server.cjs for .mcp.json registration.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import {
  COPILOT_VALID_ROLES,
  COPILOT_DEFAULT_MODEL,
  handleAskCopilot,
} from './copilot-core.js';
import {
  handleWaitForJob,
  handleCheckJobStatus,
  handleKillJob,
  handleListJobs,
  getJobManagementToolSchemas,
} from './job-management.js';

const askCopilotTool = {
  name: 'ask_copilot',
  description: `Send a prompt to GitHub Copilot CLI for analytical/planning tasks. Copilot excels at architecture review, planning validation, critical analysis, and code/security review. Requires agent_role to specify the perspective (${COPILOT_VALID_ROLES.join(', ')}). Requires Copilot CLI (npm install -g @githubnext/github-copilot-cli).`,
  inputSchema: {
    type: 'object' as const,
    properties: {
      agent_role: {
        type: 'string',
        enum: COPILOT_VALID_ROLES,
        description: `Required. Agent perspective for Copilot: ${COPILOT_VALID_ROLES.join(', ')}. Copilot is optimized for analytical/planning tasks.`
      },
      prompt_file: { type: 'string', description: 'Path to file containing the prompt' },
      output_file: { type: 'string', description: 'Required. Path to write response. Response content is NOT returned inline - read from this file.' },
      context_files: { type: 'array', items: { type: 'string' }, description: 'File paths to include as context (contents will be prepended to prompt)' },
      model: { type: 'string', description: `Copilot model to use (default: ${COPILOT_DEFAULT_MODEL}). Set OMC_COPILOT_DEFAULT_MODEL env var to change default.` },
      background: { type: 'boolean', description: 'Run in background (non-blocking). Returns immediately with job metadata and file paths. Check response file for completion.' },
      working_directory: { type: 'string', description: 'Working directory for path resolution and CLI execution. Defaults to process.cwd().' },
    },
    required: ['agent_role', 'prompt_file', 'output_file'],
  },
};

const jobTools = getJobManagementToolSchemas('copilot');

const server = new Server(
  { name: 'c', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [askCopilotTool, ...jobTools],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  if (name === 'ask_copilot') {
    const { prompt_file, output_file, agent_role, model, context_files, background, working_directory } = (args ?? {}) as {
      prompt_file: string;
      output_file: string;
      agent_role: string;
      model?: string;
      context_files?: string[];
      background?: boolean;
      working_directory?: string;
    };
    return handleAskCopilot({ prompt_file, output_file, agent_role, model, context_files, background, working_directory });
  }
  if (name === 'wait_for_job') {
    const { job_id, timeout_ms } = (args ?? {}) as { job_id: string; timeout_ms?: number };
    return handleWaitForJob('copilot', job_id, timeout_ms);
  }
  if (name === 'check_job_status') {
    const { job_id } = (args ?? {}) as { job_id: string };
    return handleCheckJobStatus('copilot', job_id);
  }
  if (name === 'kill_job') {
    const { job_id, signal } = (args ?? {}) as { job_id: string; signal?: string };
    return handleKillJob('copilot', job_id, (signal as NodeJS.Signals) || undefined);
  }
  if (name === 'list_jobs') {
    const { status_filter, limit } = (args ?? {}) as { status_filter?: string; limit?: number };
    return handleListJobs('copilot', (status_filter as 'active' | 'completed' | 'failed' | 'all') || undefined, limit);
  }
  return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true };
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Copilot MCP Server running on stdio');
}

main().catch((error) => {
  console.error('Failed to start Copilot server:', error);
  process.exit(1);
});
