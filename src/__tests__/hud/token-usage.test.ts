import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { parseTranscript } from '../../hud/transcript.js';
import { renderTokenUsage } from '../../hud/elements/token-usage.js';

const tempDirs: string[] = [];

function createTempTranscript(lines: unknown[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'omc-hud-token-usage-'));
  tempDirs.push(dir);

  const transcriptPath = join(dir, 'transcript.jsonl');
  writeFileSync(
    transcriptPath,
    `${lines.map((line) => JSON.stringify(line)).join('\n')}\n`,
    'utf8',
  );

  return transcriptPath;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe('HUD transcript token usage plumbing', () => {
  it('captures the latest transcript message usage as last-request input/output tokens', async () => {
    const transcriptPath = createTempTranscript([
      {
        timestamp: '2026-03-12T00:00:00.000Z',
        message: {
          usage: { input_tokens: 120, output_tokens: 45 },
          content: [],
        },
      },
      {
        timestamp: '2026-03-12T00:01:00.000Z',
        message: {
          usage: { input_tokens: 1530, output_tokens: 987 },
          content: [],
        },
      },
    ]);

    const result = await parseTranscript(transcriptPath);

    expect(result.lastRequestTokenUsage).toEqual({
      inputTokens: 1530,
      outputTokens: 987,
    });
  });

  it('treats missing token fields as zero when transcript usage only exposes one side', async () => {
    const transcriptPath = createTempTranscript([
      {
        timestamp: '2026-03-12T00:00:00.000Z',
        message: {
          usage: { output_tokens: 64 },
          content: [],
        },
      },
    ]);

    const result = await parseTranscript(transcriptPath);

    expect(result.lastRequestTokenUsage).toEqual({
      inputTokens: 0,
      outputTokens: 64,
    });
  });
});

describe('HUD token usage rendering', () => {
  it('formats last-request token usage as plain ASCII input/output counts', () => {
    expect(renderTokenUsage({ inputTokens: 1530, outputTokens: 987 })).toBe('tok:i1.5k/o987');
  });

  it('returns null when no last-request token usage is available', () => {
    expect(renderTokenUsage(null)).toBeNull();
  });
});
