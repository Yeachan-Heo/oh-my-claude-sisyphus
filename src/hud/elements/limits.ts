/**
 * Sisyphus HUD - Rate Limits Element
 *
 * Renders 5-hour and weekly rate limit usage display.
 */

import type { RateLimits } from '../types.js';
import { RESET } from '../colors.js';

const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const RED = '\x1b[31m';
const DIM = '\x1b[2m';

// Thresholds for rate limit warnings
const WARNING_THRESHOLD = 70;
const CRITICAL_THRESHOLD = 90;

/**
 * Get color based on percentage
 */
function getColor(percent: number): string {
  if (percent >= CRITICAL_THRESHOLD) {
    return RED;
  } else if (percent >= WARNING_THRESHOLD) {
    return YELLOW;
  }
  return GREEN;
}

/**
 * Render rate limits display.
 *
 * Format: 5h:45% wk:12%
 */
export function renderRateLimits(limits: RateLimits | null): string | null {
  if (!limits) return null;

  const fiveHour = Math.min(100, Math.max(0, Math.round(limits.fiveHourPercent)));
  const weekly = Math.min(100, Math.max(0, Math.round(limits.weeklyPercent)));

  const fiveHourColor = getColor(fiveHour);
  const weeklyColor = getColor(weekly);

  return `5h:${fiveHourColor}${fiveHour}%${RESET} ${DIM}wk:${RESET}${weeklyColor}${weekly}%${RESET}`;
}

/**
 * Render compact rate limits (just percentages).
 *
 * Format: 45%/12%
 */
export function renderRateLimitsCompact(limits: RateLimits | null): string | null {
  if (!limits) return null;

  const fiveHour = Math.min(100, Math.max(0, Math.round(limits.fiveHourPercent)));
  const weekly = Math.min(100, Math.max(0, Math.round(limits.weeklyPercent)));

  const fiveHourColor = getColor(fiveHour);
  const weeklyColor = getColor(weekly);

  return `${fiveHourColor}${fiveHour}%${RESET}/${weeklyColor}${weekly}%${RESET}`;
}
