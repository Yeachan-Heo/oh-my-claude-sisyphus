/**
 * Sisyphus HUD Type Definitions
 *
 * Type definitions for the HUD state, configuration, and rendering.
 */

// ============================================================================
// HUD State
// ============================================================================

export interface BackgroundTask {
  id: string;
  description: string;
  agentType?: string;
  startedAt: string;
  completedAt?: string;
  status: 'running' | 'completed' | 'failed';
}

export interface SisyphusHudState {
  timestamp: string;
  backgroundTasks: BackgroundTask[];
}

// ============================================================================
// Stdin from Claude Code
// ============================================================================

export interface StatuslineStdin {
  /** Transcript path for parsing conversation history */
  transcript_path: string;

  /** Current working directory */
  cwd: string;

  /** Model information */
  model: {
    id: string;
    display_name: string;
  };

  /** Context window metrics */
  context_window: {
    context_window_size: number;
    used_percentage?: number;
    current_usage?: {
      input_tokens: number;
      cache_creation_input_tokens: number;
      cache_read_input_tokens: number;
    };
  };
}

// ============================================================================
// Transcript Parsing Results
// ============================================================================

export interface TodoItem {
  content: string;
  status: 'pending' | 'in_progress' | 'completed';
  activeForm?: string;
}

export interface ActiveAgent {
  id: string;
  type: string;
  model?: string;
  description?: string;
  status: 'running' | 'completed';
  startTime: Date;
  endTime?: Date;
}

export interface TranscriptData {
  agents: ActiveAgent[];
  todos: TodoItem[];
  sessionStart?: Date;
}

// ============================================================================
// Sisyphus State Types (read from existing files)
// ============================================================================

export interface RalphStateForHud {
  active: boolean;
  iteration: number;
  maxIterations: number;
  prdMode?: boolean;
  currentStoryId?: string;
}

export interface UltraworkStateForHud {
  active: boolean;
  reinforcementCount: number;
}

export interface PrdStateForHud {
  currentStoryId: string | null;
  completed: number;
  total: number;
}

// ============================================================================
// Render Context
// ============================================================================

export interface HudRenderContext {
  /** Context window percentage (0-100) */
  contextPercent: number;

  /** Model display name */
  modelName: string;

  /** Ralph loop state */
  ralph: RalphStateForHud | null;

  /** Ultrawork state */
  ultrawork: UltraworkStateForHud | null;

  /** PRD state */
  prd: PrdStateForHud | null;

  /** Active subagents from transcript */
  activeAgents: ActiveAgent[];

  /** Todo list from transcript */
  todos: TodoItem[];

  /** Background tasks from HUD state */
  backgroundTasks: BackgroundTask[];

  /** Working directory */
  cwd: string;
}

// ============================================================================
// Configuration
// ============================================================================

export type HudPreset = 'minimal' | 'focused' | 'full';

/**
 * Agent display format options:
 * - count: agents:2
 * - codes: agents:Oes (type-coded with model tier casing)
 * - codes-duration: agents:O(2m)es (codes with duration)
 * - detailed: agents:[oracle(2m),explore,sj]
 * - descriptions: O:analyzing code | e:searching (codes + what they're doing)
 * - tasks: [analyzing code, searching...] (just descriptions - most readable)
 */
export type AgentsFormat = 'count' | 'codes' | 'codes-duration' | 'detailed' | 'descriptions' | 'tasks';

export interface HudElementConfig {
  sisyphusLabel: boolean;
  ralph: boolean;
  prdStory: boolean;
  activeSkills: boolean;
  contextBar: boolean;
  agents: boolean;
  agentsFormat: AgentsFormat;
  backgroundTasks: boolean;
  todos: boolean;
}

export interface HudThresholds {
  /** Context percentage that triggers warning color (default: 70) */
  contextWarning: number;
  /** Context percentage that triggers critical color (default: 85) */
  contextCritical: number;
  /** Ralph iteration that triggers warning color (default: 7) */
  ralphWarning: number;
}

export interface HudConfig {
  preset: HudPreset;
  elements: HudElementConfig;
  thresholds: HudThresholds;
}

export const DEFAULT_HUD_CONFIG: HudConfig = {
  preset: 'focused',
  elements: {
    sisyphusLabel: true,
    ralph: true,
    prdStory: true,
    activeSkills: true,
    contextBar: true,
    agents: true,
    agentsFormat: 'tasks', // Show what agents are doing - no learning curve
    backgroundTasks: true,
    todos: true,
  },
  thresholds: {
    contextWarning: 70,
    contextCritical: 85,
    ralphWarning: 7,
  },
};

export const PRESET_CONFIGS: Record<HudPreset, Partial<HudElementConfig>> = {
  minimal: {
    sisyphusLabel: true,
    ralph: true,
    prdStory: false,
    activeSkills: true,
    contextBar: false,
    agents: false,
    agentsFormat: 'count',
    backgroundTasks: false,
    todos: true,
  },
  focused: {
    sisyphusLabel: true,
    ralph: true,
    prdStory: true,
    activeSkills: true,
    contextBar: true,
    agents: true,
    agentsFormat: 'tasks', // Show what agents are doing - most readable
    backgroundTasks: true,
    todos: true,
  },
  full: {
    sisyphusLabel: true,
    ralph: true,
    prdStory: true,
    activeSkills: true,
    contextBar: true,
    agents: true,
    agentsFormat: 'descriptions', // Codes + descriptions for power users
    backgroundTasks: true,
    todos: true,
  },
};
