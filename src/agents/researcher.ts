/**
 * Researcher Agent - Documentation and External Reference Finder
 *
 * Searches external resources: official docs, GitHub, Stack Overflow.
 * For internal codebase searches, use explore agent instead.
 *
 * Ported from oh-my-opencode's researcher agent.
 */

import type { AgentConfig, AgentPromptMetadata } from './types.js';
import { loadAgentPrompt } from './utils.js';

export const RESEARCHER_PROMPT_METADATA: AgentPromptMetadata = {
  category: 'exploration',
  cost: 'CHEAP',
  promptAlias: 'researcher',
  triggers: [
    { domain: 'External documentation', trigger: 'API references, official docs' },
    { domain: 'OSS implementations', trigger: 'GitHub examples, package source' },
    { domain: 'Best practices', trigger: 'Community patterns, recommendations' },
  ],
  useWhen: [
    'Looking up official documentation',
    'Finding GitHub examples',
    'Researching npm/pip packages',
    'Stack Overflow solutions',
    'External API references',
  ],
  avoidWhen: [
    'Internal codebase search (use explore)',
    'Current project files (use explore)',
    'When you already have the information',
  ],
};


export const researcherAgent: AgentConfig = {
  name: 'researcher',
  description: 'Documentation researcher and external reference finder. Use for official docs, GitHub examples, OSS implementations, API references. Searches EXTERNAL resources, not internal codebase.',
  prompt: loadAgentPrompt('researcher'),
  tools: ['Read', 'Grep', 'Glob', 'WebFetch', 'WebSearch', 'ask_codex', 'lsp_hover', 'lsp_goto_definition', 'lsp_find_references', 'lsp_document_symbols', 'lsp_workspace_symbols', 'lsp_diagnostics', 'lsp_diagnostics_directory', 'lsp_servers', 'lsp_prepare_rename', 'lsp_rename', 'lsp_code_actions', 'lsp_code_action_resolve', 'ast_grep_search', 'ast_grep_replace'],
  model: 'sonnet',
  defaultModel: 'sonnet',
  metadata: RESEARCHER_PROMPT_METADATA
};
