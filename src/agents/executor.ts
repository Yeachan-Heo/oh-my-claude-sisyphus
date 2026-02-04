/**
 * Executor Agent - Focused Task Executor
 *
 * Executes tasks directly without delegation capabilities.
 * Same discipline as Sisyphus, but works alone.
 *
 * Ported from oh-my-opencode's executor agent.
 * Prompt loaded from: agents/executor.md
 */

import type { AgentConfig, AgentPromptMetadata } from './types.js';
import { loadAgentPrompt } from './utils.js';

export const SISYPHUS_JUNIOR_PROMPT_METADATA: AgentPromptMetadata = {
  category: 'specialist',
  cost: 'CHEAP',
  promptAlias: 'Junior',
  triggers: [
    { domain: 'Direct implementation', trigger: 'Single-file changes, focused tasks' },
    { domain: 'Bug fixes', trigger: 'Clear, scoped fixes' },
    { domain: 'Small features', trigger: 'Well-defined, isolated work' },
  ],
  useWhen: [
    'Direct, focused implementation tasks',
    'Single-file or few-file changes',
    'When delegation overhead isn\'t worth it',
    'Clear, well-scoped work items',
  ],
  avoidWhen: [
    'Multi-file refactoring (use orchestrator)',
    'Tasks requiring research (use explore/researcher first)',
    'Complex decisions (consult architect)',
  ],
};

export const executorAgent: AgentConfig = {
  name: 'executor',
  description: 'Focused task executor. Execute tasks directly. NEVER delegate or spawn other agents. Same discipline as Sisyphus, no delegation.',
  prompt: loadAgentPrompt('executor'),
  tools: ['Read', 'Write', 'Edit', 'Grep', 'Glob', 'Bash', 'lsp_hover', 'lsp_goto_definition', 'lsp_find_references', 'lsp_document_symbols', 'lsp_workspace_symbols', 'lsp_diagnostics', 'lsp_diagnostics_directory', 'lsp_servers', 'lsp_prepare_rename', 'lsp_rename', 'lsp_code_actions', 'lsp_code_action_resolve', 'ast_grep_search', 'ast_grep_replace', 'ask_gemini'],
  model: 'sonnet',
  defaultModel: 'sonnet',
  metadata: SISYPHUS_JUNIOR_PROMPT_METADATA
};
