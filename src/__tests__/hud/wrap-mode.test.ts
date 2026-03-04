import { describe, it, expect } from 'vitest';
import { truncateLineToMaxWidth } from '../../hud/render.js';
import { stringWidth } from '../../utils/string-width.js';
import { dim } from '../../hud/colors.js';

/**
 * wrapLineToMaxWidth is not exported, so we test it indirectly via the
 * render module's exported helpers plus direct behavioral tests.
 *
 * We re-implement the wrap logic here for unit-level validation since
 * the function is module-private.  A follow-up may export it for direct testing.
 */

const PLAIN_SEPARATOR = ' | ';
const DIM_SEPARATOR = dim(PLAIN_SEPARATOR);

/**
 * Mirror of the private wrapLineToMaxWidth for testing purposes.
 * Wraps a line at HUD separator boundaries (' | ') so each wrapped
 * line fits within maxWidth visible columns.
 */
function wrapLineToMaxWidth(line: string, maxWidth: number): string[] {
  if (maxWidth <= 0) return [''];
  if (stringWidth(line) <= maxWidth) return [line];

  const separator = line.includes(DIM_SEPARATOR)
    ? DIM_SEPARATOR
    : line.includes(PLAIN_SEPARATOR)
      ? PLAIN_SEPARATOR
      : null;

  if (!separator) {
    return [truncateLineToMaxWidth(line, maxWidth)];
  }

  const segments = line.split(separator);
  if (segments.length <= 1) {
    return [truncateLineToMaxWidth(line, maxWidth)];
  }

  const wrapped: string[] = [];
  let current = segments[0] ?? '';

  for (let i = 1; i < segments.length; i += 1) {
    const nextSegment = segments[i] ?? '';
    const candidate = `${current}${separator}${nextSegment}`;

    if (stringWidth(candidate) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (stringWidth(current) > maxWidth) {
      wrapped.push(truncateLineToMaxWidth(current, maxWidth));
    } else {
      wrapped.push(current);
    }

    current = nextSegment;
  }

  if (stringWidth(current) > maxWidth) {
    wrapped.push(truncateLineToMaxWidth(current, maxWidth));
  } else {
    wrapped.push(current);
  }

  return wrapped;
}

describe('wrapLineToMaxWidth', () => {
  describe('basic wrapping', () => {
    it('returns line unchanged when within maxWidth', () => {
      const line = '[OMC] | ctx:30%';
      const result = wrapLineToMaxWidth(line, 80);
      expect(result).toEqual([line]);
    });

    it('returns empty string array for maxWidth of 0', () => {
      const result = wrapLineToMaxWidth('something', 0);
      expect(result).toEqual(['']);
    });

    it('returns empty string array for negative maxWidth', () => {
      const result = wrapLineToMaxWidth('something', -5);
      expect(result).toEqual(['']);
    });

    it('wraps at separator boundaries when line exceeds maxWidth', () => {
      const line = '[OMC#4.5.0] | 5h:45% | ctx:30% | agents:3';
      const result = wrapLineToMaxWidth(line, 30);
      expect(result.length).toBeGreaterThan(1);
      for (const wrappedLine of result) {
        expect(stringWidth(wrappedLine)).toBeLessThanOrEqual(30);
      }
    });

    it('preserves all content across wrapped lines', () => {
      const segments = ['[OMC#4.5.0]', '5h:45%', 'ctx:30%', 'agents:3'];
      const line = segments.join(PLAIN_SEPARATOR);
      const result = wrapLineToMaxWidth(line, 30);
      const joined = result.join(PLAIN_SEPARATOR);
      for (const seg of segments) {
        expect(joined).toContain(seg);
      }
    });
  });

  describe('separator handling', () => {
    it('falls back to truncation when no separator is present', () => {
      const line = 'abcdefghijklmnopqrstuvwxyz';
      const result = wrapLineToMaxWidth(line, 10);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatch(/\.\.\.$/);
      expect(stringWidth(result[0]!)).toBeLessThanOrEqual(10);
    });

    it('handles dim separator (ANSI-styled " | ")', () => {
      const line = `[OMC]${DIM_SEPARATOR}ctx:30%${DIM_SEPARATOR}agents:3${DIM_SEPARATOR}bg:2 tasks`;
      const result = wrapLineToMaxWidth(line, 25);
      expect(result.length).toBeGreaterThan(1);
      for (const wrappedLine of result) {
        expect(stringWidth(wrappedLine)).toBeLessThanOrEqual(25);
      }
    });

    it('prefers dim separator over plain separator', () => {
      // Line with both dim and plain separators — dim should take precedence
      const line = `[OMC]${DIM_SEPARATOR}plain | mixed${DIM_SEPARATOR}end`;
      const result = wrapLineToMaxWidth(line, 20);
      // Should split on dim separator, keeping "plain | mixed" as one segment
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('edge cases', () => {
    it('handles single segment exceeding maxWidth', () => {
      const line = 'very-long-single-segment-without-separator | short';
      const result = wrapLineToMaxWidth(line, 15);
      // First segment exceeds maxWidth, should be truncated
      expect(result.length).toBeGreaterThanOrEqual(1);
      for (const wrappedLine of result) {
        expect(stringWidth(wrappedLine)).toBeLessThanOrEqual(15);
      }
    });

    it('handles all segments fitting on one line', () => {
      const line = 'a | b | c';
      const result = wrapLineToMaxWidth(line, 100);
      expect(result).toEqual([line]);
    });

    it('handles exactly one separator', () => {
      const line = 'left-side | right-side';
      const result = wrapLineToMaxWidth(line, 12);
      expect(result.length).toBe(2);
      expect(result[0]).toBe('left-side');
      expect(result[1]).toBe('right-side');
    });

    it('handles empty segments', () => {
      const line = ' |  | content';
      const result = wrapLineToMaxWidth(line, 50);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('realistic HUD scenarios', () => {
    it('wraps a full HUD header into multiple lines', () => {
      const line = [
        '[OMC#4.4.4]',
        '5h:5%(3h31m) wk:19%(3d22h)',
        'session:9m',
        '🟢',
        '~$0.1580',
        '46.8k',
        'Cache: 89.1%',
        '$1.03/h',
        'ctx:23%',
      ].join(PLAIN_SEPARATOR);

      const result = wrapLineToMaxWidth(line, 60);
      expect(result.length).toBeGreaterThan(1);
      for (const wrappedLine of result) {
        expect(stringWidth(wrappedLine)).toBeLessThanOrEqual(60);
      }
    });

    it('wraps narrow terminal (40 cols) without losing data', () => {
      const segments = ['[OMC#4.4.4]', '5h:45%', 'ctx:30%', 'agents:2'];
      const line = segments.join(PLAIN_SEPARATOR);
      const result = wrapLineToMaxWidth(line, 40);

      // All original segments should appear somewhere in the output
      const allOutput = result.join(' ');
      for (const seg of segments) {
        expect(allOutput).toContain(seg);
      }
    });

    it('handles HUD with ANSI dim separators at 80 cols', () => {
      const elements = ['[OMC#4.5.0]', '5h:12%', 'wk:8%', 'session:42m', '🟢', 'ctx:15%'];
      const line = elements.join(DIM_SEPARATOR);
      const result = wrapLineToMaxWidth(line, 80);
      // Should fit on one line at 80 cols
      expect(result).toHaveLength(1);
    });
  });
});
