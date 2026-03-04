import { describe, it, expect } from 'vitest';
import { wrapLineAtElements } from '../../hud/render.js';
import { stringWidth } from '../../utils/string-width.js';

describe('wrapLineAtElements', () => {
  describe('no wrapping needed', () => {
    it('returns single-element array when line fits within maxWidth', () => {
      const result = wrapLineAtElements('short line', 80);
      expect(result).toEqual(['short line']);
    });

    it('returns empty string for maxWidth of 0', () => {
      const result = wrapLineAtElements('something', 0);
      expect(result).toEqual(['']);
    });
  });

  describe('wrapping at element boundaries', () => {
    it('wraps at pipe separators when line exceeds maxWidth', () => {
      const line = '[OMC#4.4.4] | 5h:5%(3h31m) | session:9m | ctx:23% | ~$0.15 | 46.8k';
      const result = wrapLineAtElements(line, 40);

      // All lines should fit within maxWidth
      for (const wrappedLine of result) {
        expect(stringWidth(wrappedLine)).toBeLessThanOrEqual(40);
      }

      // Should produce multiple lines
      expect(result.length).toBeGreaterThan(1);
    });

    it('preserves all elements across wrapped lines', () => {
      const elements = ['[OMC#4.4.4]', '5h:5%', 'session:9m', 'ctx:23%', '~$0.15'];
      const line = elements.join(' | ');
      const result = wrapLineAtElements(line, 30);

      // Every element should appear in some wrapped line
      const allText = result.join(' | ');
      for (const el of elements) {
        expect(allText).toContain(el);
      }
    });

    it('does not break mid-element', () => {
      const line = 'element-one | element-two | element-three';
      const result = wrapLineAtElements(line, 25);

      for (const wrappedLine of result) {
        // Each line should be a complete element or elements joined by separator
        expect(wrappedLine).not.toMatch(/^[\s|]/);
        expect(wrappedLine).not.toMatch(/[\s|]$/);
      }
    });
  });

  describe('edge cases', () => {
    it('falls back to truncation when no separators exist', () => {
      const line = 'a very long line without any pipe separators at all';
      const result = wrapLineAtElements(line, 20);
      expect(result).toHaveLength(1);
      expect(result[0]).toMatch(/\.\.\.$/);
    });

    it('handles single element that fits', () => {
      const result = wrapLineAtElements('[OMC#4.4.4]', 80);
      expect(result).toEqual(['[OMC#4.4.4]']);
    });

    it('handles single element that exceeds maxWidth', () => {
      const result = wrapLineAtElements('a-very-long-single-element-without-separators', 10);
      expect(result).toHaveLength(1);
      expect(stringWidth(result[0])).toBeLessThanOrEqual(10);
    });
  });
});
