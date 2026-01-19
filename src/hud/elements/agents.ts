/**
 * Sisyphus HUD - Agents Element
 *
 * Renders active agent count display with multiple format options:
 * - count: agents:2
 * - codes: agents:Oes (type-coded with model tier casing)
 * - detailed: agents:[oracle(2m),explore,sj]
 */

import type { ActiveAgent, AgentsFormat } from '../types.js';
import { cyan, dim, RESET, getModelTierColor, getDurationColor } from '../colors.js';

const CYAN = '\x1b[36m';

// ============================================================================
// Agent Type Codes
// ============================================================================

/**
 * Single-character codes for each agent type.
 * Case indicates model tier: Uppercase = Opus, lowercase = Sonnet/Haiku
 */
const AGENT_TYPE_CODES: Record<string, string> = {
  oracle: 'O',
  'oracle-low': 'o',
  'oracle-medium': 'o',
  explore: 'E',
  'explore-medium': 'e',
  'sisyphus-junior': 'S',
  'sisyphus-junior-low': 's',
  'sisyphus-junior-high': 'S',
  'frontend-engineer': 'F',
  'frontend-engineer-low': 'f',
  'frontend-engineer-high': 'F',
  librarian: 'L',
  'librarian-low': 'l',
  'document-writer': 'd', // Always haiku
  prometheus: 'P', // Always opus
  momus: 'M', // Always opus
  metis: 'T', // Me**t**is (M taken)
  'qa-tester': 'q', // Always sonnet
  'multimodal-looker': 'v', // **V**isual (always sonnet)
};

/**
 * Get single-character code for an agent type.
 */
function getAgentCode(agentType: string, model?: string): string {
  // Extract the short name from full type (e.g., "oh-my-claude-sisyphus:oracle" -> "oracle")
  const parts = agentType.split(':');
  const shortName = parts[parts.length - 1] || agentType;

  // Look up the code
  let code = AGENT_TYPE_CODES[shortName];

  if (!code) {
    // Unknown agent - use first letter
    code = shortName.charAt(0).toUpperCase();
  }

  // Determine case based on model tier if code is single letter
  if (model) {
    const tier = model.toLowerCase();
    if (tier.includes('opus')) {
      code = code.toUpperCase();
    } else {
      code = code.toLowerCase();
    }
  }

  return code;
}

/**
 * Format duration for display.
 * <10s: no suffix, 10s-59s: (Xs), 1m-9m: (Xm), >=10m: !
 */
function formatDuration(durationMs: number): string {
  const seconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(seconds / 60);

  if (seconds < 10) {
    return ''; // No suffix for very short durations
  } else if (seconds < 60) {
    return `(${seconds}s)`;
  } else if (minutes < 10) {
    return `(${minutes}m)`;
  } else {
    return '!'; // Alert for very long durations
  }
}

// ============================================================================
// Render Functions
// ============================================================================

/**
 * Render active agent count.
 * Returns null if no agents are running.
 *
 * Format: agents:2
 */
export function renderAgents(agents: ActiveAgent[]): string | null {
  const running = agents.filter((a) => a.status === 'running').length;

  if (running === 0) {
    return null;
  }

  return `agents:${CYAN}${running}${RESET}`;
}

/**
 * Render agents with single-character type codes.
 * Uppercase = Opus tier, lowercase = Sonnet/Haiku.
 * Color-coded by model tier.
 *
 * Format: agents:Oes
 */
export function renderAgentsCoded(agents: ActiveAgent[]): string | null {
  const running = agents.filter((a) => a.status === 'running');

  if (running.length === 0) {
    return null;
  }

  // Build coded string with colors
  const codes = running.map((a) => {
    const code = getAgentCode(a.type, a.model);
    const color = getModelTierColor(a.model);
    return `${color}${code}${RESET}`;
  });

  return `agents:${codes.join('')}`;
}

/**
 * Render agents with codes and duration indicators.
 * Shows how long each agent has been running.
 *
 * Format: agents:O(2m)es
 */
export function renderAgentsCodedWithDuration(agents: ActiveAgent[]): string | null {
  const running = agents.filter((a) => a.status === 'running');

  if (running.length === 0) {
    return null;
  }

  const now = Date.now();

  // Build coded string with colors and durations
  const codes = running.map((a) => {
    const code = getAgentCode(a.type, a.model);
    const durationMs = now - a.startTime.getTime();
    const duration = formatDuration(durationMs);

    // Color the code by model tier
    const modelColor = getModelTierColor(a.model);

    if (duration === '!') {
      // Alert case - show exclamation in duration color
      const durationColor = getDurationColor(durationMs);
      return `${modelColor}${code}${durationColor}!${RESET}`;
    } else if (duration) {
      // Normal duration - dim the time portion
      return `${modelColor}${code}${dim(duration)}${RESET}`;
    } else {
      // No duration suffix
      return `${modelColor}${code}${RESET}`;
    }
  });

  return `agents:${codes.join('')}`;
}

/**
 * Render detailed agent list (for full mode).
 *
 * Format: agents:[oracle(2m),explore,sj]
 */
export function renderAgentsDetailed(agents: ActiveAgent[]): string | null {
  const running = agents.filter((a) => a.status === 'running');

  if (running.length === 0) {
    return null;
  }

  const now = Date.now();

  // Extract short agent type names with duration
  const names = running.map((a) => {
    // Extract last part of agent type (e.g., "oh-my-claude-sisyphus:explore" -> "explore")
    const parts = a.type.split(':');
    let name = parts[parts.length - 1] || a.type;

    // Abbreviate common names
    if (name === 'sisyphus-junior') name = 'sj';
    if (name === 'sisyphus-junior-low') name = 'sj-l';
    if (name === 'sisyphus-junior-high') name = 'sj-h';
    if (name === 'frontend-engineer') name = 'fe';
    if (name === 'frontend-engineer-low') name = 'fe-l';
    if (name === 'frontend-engineer-high') name = 'fe-h';
    if (name === 'document-writer') name = 'doc';
    if (name === 'multimodal-looker') name = 'visual';

    // Add duration if significant
    const durationMs = now - a.startTime.getTime();
    const duration = formatDuration(durationMs);

    return duration ? `${name}${duration}` : name;
  });

  return `agents:[${CYAN}${names.join(',')}${RESET}]`;
}

/**
 * Truncate description to fit in statusline.
 */
function truncateDescription(desc: string | undefined, maxLen: number = 20): string {
  if (!desc) return '...';
  if (desc.length <= maxLen) return desc;
  return desc.slice(0, maxLen - 3) + '...';
}

/**
 * Get short agent type name.
 */
function getShortAgentName(agentType: string): string {
  const parts = agentType.split(':');
  let name = parts[parts.length - 1] || agentType;

  // Abbreviate common names
  const abbrevs: Record<string, string> = {
    'sisyphus-junior': 'sj',
    'sisyphus-junior-low': 'sj',
    'sisyphus-junior-high': 'sj',
    'frontend-engineer': 'fe',
    'frontend-engineer-low': 'fe',
    'frontend-engineer-high': 'fe',
    'document-writer': 'doc',
    'multimodal-looker': 'visual',
    'oracle-low': 'oracle',
    'oracle-medium': 'oracle',
    'explore-medium': 'explore',
    'librarian-low': 'lib',
  };

  return abbrevs[name] || name;
}

/**
 * Render agents with descriptions - most informative format.
 * Shows what each agent is actually doing.
 *
 * Format: O:analyzing code | e:searching files
 */
export function renderAgentsWithDescriptions(agents: ActiveAgent[]): string | null {
  const running = agents.filter((a) => a.status === 'running');

  if (running.length === 0) {
    return null;
  }

  const now = Date.now();

  // Build agent entries with descriptions
  const entries = running.map((a) => {
    const code = getAgentCode(a.type, a.model);
    const color = getModelTierColor(a.model);
    const desc = truncateDescription(a.description, 25);
    const durationMs = now - a.startTime.getTime();
    const duration = formatDuration(durationMs);

    // Format: O:description or O:description(2m)
    let entry = `${color}${code}${RESET}:${dim(desc)}`;
    if (duration && duration !== '!') {
      entry += dim(duration);
    } else if (duration === '!') {
      const durationColor = getDurationColor(durationMs);
      entry += `${durationColor}!${RESET}`;
    }

    return entry;
  });

  return entries.join(dim(' | '));
}

/**
 * Render agents showing descriptions only (no codes).
 * Maximum clarity about what's running.
 *
 * Format: [analyzing code, searching files]
 */
export function renderAgentsDescOnly(agents: ActiveAgent[]): string | null {
  const running = agents.filter((a) => a.status === 'running');

  if (running.length === 0) {
    return null;
  }

  const now = Date.now();

  // Build descriptions
  const descriptions = running.map((a) => {
    const color = getModelTierColor(a.model);
    const shortName = getShortAgentName(a.type);
    const desc = a.description ? truncateDescription(a.description, 20) : shortName;
    const durationMs = now - a.startTime.getTime();
    const duration = formatDuration(durationMs);

    if (duration === '!') {
      const durationColor = getDurationColor(durationMs);
      return `${color}${desc}${durationColor}!${RESET}`;
    } else if (duration) {
      return `${color}${desc}${dim(duration)}${RESET}`;
    }
    return `${color}${desc}${RESET}`;
  });

  return `[${descriptions.join(dim(', '))}]`;
}

/**
 * Render agents based on format configuration.
 */
export function renderAgentsByFormat(
  agents: ActiveAgent[],
  format: AgentsFormat
): string | null {
  switch (format) {
    case 'count':
      return renderAgents(agents);
    case 'codes':
      return renderAgentsCoded(agents);
    case 'codes-duration':
      return renderAgentsCodedWithDuration(agents);
    case 'detailed':
      return renderAgentsDetailed(agents);
    case 'descriptions':
      return renderAgentsWithDescriptions(agents);
    case 'tasks':
      return renderAgentsDescOnly(agents);
    default:
      return renderAgentsCoded(agents);
  }
}
