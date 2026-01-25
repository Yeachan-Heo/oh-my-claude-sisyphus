import { describe, it, expect } from 'vitest';
import { renderSessionHealthAnalytics } from '../../hud/analytics-display.js';
import type { SessionHealth } from '../../hud/types.js';

describe('renderSessionHealthAnalytics', () => {
  const baseHealth: SessionHealth = {
    durationMinutes: 5,
    messageCount: 0,
    health: 'healthy',
    sessionCost: 0,
    totalTokens: 0,
    cacheHitRate: 0,
    costPerHour: 0,
    isEstimated: false,
  };

  it('renders with sessionCost = 0 (should NOT return empty)', () => {
    const result = renderSessionHealthAnalytics({ ...baseHealth, sessionCost: 0 });
    expect(result).not.toBe('');
    expect(result).toContain('$0.0000');
  });

  it('renders with non-zero analytics', () => {
    const result = renderSessionHealthAnalytics({
      ...baseHealth,
      sessionCost: 1.2345,
      totalTokens: 50000,
      cacheHitRate: 45.6,
      costPerHour: 2.50,
    });
    expect(result).toContain('$1.2345');
    expect(result).toContain('50.0k');
    expect(result).toContain('45.6%');
    expect(result).toContain('| $2.50/h');
  });

  it('renders with estimated prefix when isEstimated is true', () => {
    const result = renderSessionHealthAnalytics({
      ...baseHealth,
      sessionCost: 0.5,
      isEstimated: true,
    });
    expect(result).toContain('~$0.5000');
  });

  it('renders correct health indicator for healthy', () => {
    const result = renderSessionHealthAnalytics({
      ...baseHealth,
      health: 'healthy',
      sessionCost: 0.1,
    });
    expect(result).toContain('\u{1F7E2}'); // green circle
  });

  it('renders correct health indicator for warning', () => {
    const result = renderSessionHealthAnalytics({
      ...baseHealth,
      health: 'warning',
      sessionCost: 2.5,
    });
    expect(result).toContain('\u{1F7E1}'); // yellow circle
  });

  it('renders correct health indicator for critical', () => {
    const result = renderSessionHealthAnalytics({
      ...baseHealth,
      health: 'critical',
      sessionCost: 6.0,
    });
    expect(result).toContain('\u{1F534}'); // red circle
  });

  it('handles undefined totalTokens gracefully (fallback to 0)', () => {
    const result = renderSessionHealthAnalytics({
      ...baseHealth,
      sessionCost: 1.0,
      totalTokens: undefined as any,
    });
    // Should not throw and should contain some token value
    expect(result).toBeDefined();
    expect(result).toContain('0');
  });

  it('handles undefined cacheHitRate gracefully (fallback to 0.0)', () => {
    const result = renderSessionHealthAnalytics({
      ...baseHealth,
      sessionCost: 1.0,
      cacheHitRate: undefined as any,
    });
    // Should not throw and should contain cache percentage
    expect(result).toBeDefined();
    expect(result).toContain('0.0%');
  });

  it('handles large token counts with K suffix', () => {
    const result = renderSessionHealthAnalytics({
      ...baseHealth,
      sessionCost: 0.5,
      totalTokens: 125000,
    });
    expect(result).toContain('125.0k');
  });

  it('handles very large token counts with M suffix', () => {
    const result = renderSessionHealthAnalytics({
      ...baseHealth,
      sessionCost: 5.0,
      totalTokens: 2500000,
    });
    expect(result).toContain('2.50M');
  });
});
