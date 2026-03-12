/**
 * OMC HUD - Token Usage Element
 *
 * Renders last-request input/output token usage from transcript metadata.
 */

import type { LastRequestTokenUsage } from '../types.js';
import { formatTokenCount } from '../../cli/utils/formatting.js';

export function renderTokenUsage(usage: LastRequestTokenUsage | null | undefined): string | null {
  if (!usage) return null;

  const hasUsage = usage.inputTokens > 0 || usage.outputTokens > 0;
  if (!hasUsage) return null;

  return `tok:i${formatTokenCount(usage.inputTokens)}/o${formatTokenCount(usage.outputTokens)}`;
}
