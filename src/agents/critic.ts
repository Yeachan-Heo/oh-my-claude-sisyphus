/**
 * Critic Agent
 *
 * Expert plan reviewer with ruthless evaluation standards.
 *
 * Ported from oh-my-opencode's agent definitions.
 */

import type { AgentConfig, AgentPromptMetadata } from './types.js';
import { loadAgentPrompt } from './utils.js';

export const CRITIC_PROMPT_METADATA: AgentPromptMetadata = {
  category: 'reviewer',
  cost: 'EXPENSIVE',
  promptAlias: 'critic',
  triggers: [
    {
      domain: 'Plan Review',
      trigger: 'Evaluating work plans before execution',
    },
  ],
  useWhen: [
    'After planner creates a work plan',
    'Before executing a complex plan',
    'When plan quality validation is needed',
    'To catch gaps before implementation',
  ],
  avoidWhen: [
    'Simple, straightforward tasks',
    'When no plan exists to review',
    'During implementation phase',
  ],
};

export const criticAgent: AgentConfig = {
  name: 'critic',
  description: `Expert reviewer for evaluating work plans against rigorous clarity, verifiability, and completeness standards. Use after planner creates a work plan to validate it before execution.`,
  prompt: loadAgentPrompt('critic'),
  tools: ['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash', 'lsp_hover', 'lsp_goto_definition', 'lsp_find_references', 'lsp_document_symbols', 'lsp_workspace_symbols', 'lsp_diagnostics', 'lsp_diagnostics_directory', 'lsp_servers', 'lsp_prepare_rename', 'lsp_rename', 'lsp_code_actions', 'lsp_code_action_resolve', 'ast_grep_search', 'ast_grep_replace', 'ask_codex'],
  model: 'opus',
  defaultModel: 'opus',
  metadata: CRITIC_PROMPT_METADATA,
};
