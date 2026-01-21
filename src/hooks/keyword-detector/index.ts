/**
 * Keyword Detector Hook
 *
 * Detects magic keywords in user prompts and returns the appropriate
 * mode message to inject into context.
 *
 * Ported from oh-my-opencode's keyword-detector hook.
 */

export type KeywordType = 'ralph' | 'autopilot' | 'ultrawork' | 'ultrathink' | 'search' | 'analyze';

export interface DetectedKeyword {
  type: KeywordType;
  keyword: string;
  position: number;
}

/**
 * Autopilot keywords
 */
const AUTOPILOT_KEYWORDS = [
  'autopilot',
  'auto pilot',
  'auto-pilot',
  'autonomous',
  'full auto',
  'fullsend',
];

const AUTOPILOT_PHRASE_PATTERNS = [
  /\bbuild\s+me\s+/i,
  /\bcreate\s+me\s+/i,
  /\bmake\s+me\s+/i,
  /\bi\s+want\s+a\s+/i,
  /\bi\s+want\s+an\s+/i,
  /\bhandle\s+it\s+all\b/i,
  /\bend\s+to\s+end\b/i,
  /\be2e\s+this\b/i,
];

/**
 * Keyword patterns for each mode
 */
const KEYWORD_PATTERNS: Record<KeywordType, RegExp> = {
  ralph: /\b(ralph|don't stop|must complete|until done)\b/i,
  autopilot: /\b(autopilot|auto pilot|auto-pilot|autonomous|full auto|fullsend)\b/i,
  ultrawork: /\b(ultrawork|ulw)\b/i,
  ultrathink: /\b(ultrathink|think)\b/i,
  search: /\b(search|find|locate|lookup|explore|discover|scan|grep|query|browse|detect|trace|seek|track|pinpoint|hunt)\b|where\s+is|show\s+me|list\s+all/i,
  analyze: /\b(analyze|analyse|investigate|examine|research|study|deep.?dive|inspect|audit|evaluate|assess|review|diagnose|scrutinize|dissect|debug|comprehend|interpret|breakdown|understand)\b|why\s+is|how\s+does|how\s+to/i
};

/**
 * Priority order for keyword detection
 * Higher priority keywords take precedence
 */
const KEYWORD_PRIORITY: KeywordType[] = ['ralph', 'autopilot', 'ultrawork', 'ultrathink', 'search', 'analyze'];

/**
 * Remove code blocks from text to prevent false positives
 * Handles both fenced code blocks and inline code
 */
export function removeCodeBlocks(text: string): string {
  // Remove fenced code blocks (``` or ~~~)
  let result = text.replace(/```[\s\S]*?```/g, '');
  result = result.replace(/~~~[\s\S]*?~~~/g, '');

  // Remove inline code (single backticks)
  result = result.replace(/`[^`]+`/g, '');

  return result;
}

/**
 * Extract prompt text from message parts
 */
export function extractPromptText(
  parts: Array<{ type: string; text?: string; [key: string]: unknown }>
): string {
  return parts
    .filter(p => p.type === 'text' && p.text)
    .map(p => p.text!)
    .join(' ');
}

/**
 * Detect keywords in text and return matches with type info
 */
export function detectKeywordsWithType(
  text: string,
  _agentName?: string
): DetectedKeyword[] {
  const detected: DetectedKeyword[] = [];
  const cleanedText = removeCodeBlocks(text);

  // Check for autopilot keywords
  const hasAutopilot = AUTOPILOT_KEYWORDS.some(kw =>
    cleanedText.toLowerCase().includes(kw.toLowerCase())
  );

  // Check for autopilot phrase patterns
  const hasAutopilotPhrase = AUTOPILOT_PHRASE_PATTERNS.some(pattern =>
    pattern.test(cleanedText)
  );

  if (hasAutopilot || hasAutopilotPhrase) {
    const keyword = hasAutopilot ? 'autopilot' : 'build-phrase';
    const position = cleanedText.toLowerCase().indexOf(keyword.toLowerCase());
    detected.push({
      type: 'autopilot',
      keyword,
      position: position >= 0 ? position : 0
    });
  }

  // Check each keyword type
  for (const type of KEYWORD_PRIORITY) {
    const pattern = KEYWORD_PATTERNS[type];
    const match = cleanedText.match(pattern);

    if (match && match.index !== undefined) {
      detected.push({
        type,
        keyword: match[0],
        position: match.index
      });
    }
  }

  return detected;
}

/**
 * Check if text contains any magic keyword
 */
export function hasKeyword(text: string): boolean {
  const cleanText = removeCodeBlocks(text);
  return detectKeywordsWithType(cleanText).length > 0;
}

/**
 * Get the highest priority keyword detected
 */
export function getPrimaryKeyword(text: string): DetectedKeyword | null {
  const cleanText = removeCodeBlocks(text);
  const detected = detectKeywordsWithType(cleanText);

  if (detected.length === 0) {
    return null;
  }

  // Return highest priority (first in KEYWORD_PRIORITY order)
  for (const type of KEYWORD_PRIORITY) {
    const match = detected.find(d => d.type === type);
    if (match) {
      return match;
    }
  }

  return detected[0];
}
