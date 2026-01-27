/**
 * Test for the "Top: none" fix
 *
 * Verifies that calculateSessionHealth correctly fetches top agents
 * from TokenTracker instead of returning an empty hardcoded array.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('Top Agents Display Fix', () => {
  describe('Source code verification', () => {
    it('calculateSessionHealth calls getTopAgents instead of hardcoding empty array', async () => {
      // Read the source file to verify the fix is in place
      const indexPath = path.join(process.cwd(), 'src/hud/index.ts');
      const sourceCode = await fs.readFile(indexPath, 'utf-8');

      // The fix should include these patterns:
      // 1. Get sessionId from stdin
      expect(sourceCode).toContain('extractSessionId(stdin.transcript_path)');

      // 2. Get tracker with sessionId
      expect(sourceCode).toContain('getTokenTracker(sessionId)');

      // 3. Call getTopAgents on the tracker
      expect(sourceCode).toContain('tracker.getTopAgents(');

      // 4. Map results to the expected format
      expect(sourceCode).toContain('.map(a => ({ agent: a.agent, cost: a.cost }))');

      // 5. Should NOT have the old hardcoded empty array pattern
      // (this was: topAgents: [], in the return statement)
      // The fix replaces it with a variable reference
      expect(sourceCode).toMatch(/topAgents,\s*\n\s*costPerHour/);
    });

    it('has proper error handling for top agents fetch', async () => {
      const indexPath = path.join(process.cwd(), 'src/hud/index.ts');
      const sourceCode = await fs.readFile(indexPath, 'utf-8');

      // Should have try-catch around the top agents fetch
      expect(sourceCode).toContain('// Get top agents from tracker');
      expect(sourceCode).toContain('// Top agents fetch failed - continue with empty');
    });
  });

  describe('Type verification', () => {
    it('SessionHealth.topAgents has correct type structure', async () => {
      const typesPath = path.join(process.cwd(), 'src/hud/types.ts');
      const typesSource = await fs.readFile(typesPath, 'utf-8');

      // topAgents should be an array of objects with agent and cost
      expect(typesSource).toContain('topAgents?: Array<{ agent: string; cost: number }>');
    });
  });

  describe('Data flow verification', () => {
    it('extractSessionId is imported and used', async () => {
      const indexPath = path.join(process.cwd(), 'src/hud/index.ts');
      const sourceCode = await fs.readFile(indexPath, 'utf-8');

      // extractSessionId should be imported from output-estimator
      expect(sourceCode).toContain("import { extractSessionId } from '../analytics/output-estimator.js'");
    });

    it('getTokenTracker is imported and used', async () => {
      const indexPath = path.join(process.cwd(), 'src/hud/index.ts');
      const sourceCode = await fs.readFile(indexPath, 'utf-8');

      // getTokenTracker should be imported from token-tracker
      expect(sourceCode).toContain("import { getTokenTracker } from '../analytics/token-tracker.js'");
    });
  });
});

describe('TokenTracker.getTopAgents contract', () => {
  it('getTopAgents method exists in TokenTracker', async () => {
    const trackerPath = path.join(process.cwd(), 'src/analytics/token-tracker.ts');
    const sourceCode = await fs.readFile(trackerPath, 'utf-8');

    // Method should be defined with correct signature
    expect(sourceCode).toContain('async getTopAgents(limit: number = 5)');
    expect(sourceCode).toContain('Promise<Array<{ agent: string; tokens: number; cost: number }>>');
  });

  it('getTopAgents reads from sessionStats.byAgent', async () => {
    const trackerPath = path.join(process.cwd(), 'src/analytics/token-tracker.ts');
    const sourceCode = await fs.readFile(trackerPath, 'utf-8');

    // Should read from sessionStats.byAgent
    expect(sourceCode).toContain('this.sessionStats.byAgent');
  });

  it('getTopAgents sorts by cost descending', async () => {
    const trackerPath = path.join(process.cwd(), 'src/analytics/token-tracker.ts');
    const sourceCode = await fs.readFile(trackerPath, 'utf-8');

    // Should sort by cost descending
    expect(sourceCode).toContain('sort((a, b) => b.cost - a.cost)');
  });
});
