/**
 * OMC HUD - Thinking Indicator Element
 *
 * Renders extended thinking mode indicator.
 */

import type { ThinkingState } from '../types.js';
import { RESET } from '../colors.js';

// Local color constants (following context.ts pattern)
const CYAN = '\x1b[36m';

/**
 * Render thinking indicator.
 *
 * Format: 💭 (thought bubble emoji)
 */
export function renderThinking(state: ThinkingState | null): string | null {
  if (!state?.active) return null;
  return '💭';
}
