#!/usr/bin/env node
/**
 * Sisyphus HUD - Main Entry Point
 *
 * Statusline command that visualizes oh-my-claude-sisyphus state.
 * Receives stdin JSON from Claude Code and outputs formatted statusline.
 */

import { readStdin, getContextPercent, getModelName } from './stdin.js';
import { parseTranscript } from './transcript.js';
import { readHudState, readHudConfig, getRunningTasks } from './state.js';
import {
  readRalphStateForHud,
  readUltraworkStateForHud,
  readPrdStateForHud,
} from './sisyphus-state.js';
import { getUsage } from './usage-api.js';
import { render } from './render.js';
import type { HudRenderContext } from './types.js';

/**
 * Main HUD entry point
 */
async function main(): Promise<void> {
  try {
    // Read stdin from Claude Code
    const stdin = await readStdin();

    if (!stdin) {
      // No stdin - output placeholder
      console.log('[SISYPHUS] waiting...');
      return;
    }

    const cwd = stdin.cwd || process.cwd();

    // Parse transcript for agents and todos
    const transcriptData = await parseTranscript(stdin.transcript_path);

    // Read Sisyphus state files
    const ralph = readRalphStateForHud(cwd);
    const ultrawork = readUltraworkStateForHud(cwd);
    const prd = readPrdStateForHud(cwd);

    // Read HUD state for background tasks
    const hudState = readHudState(cwd);
    const backgroundTasks = hudState?.backgroundTasks || [];

    // Read configuration
    const config = readHudConfig();

    // Fetch rate limits from OAuth API (if available)
    const rateLimits = config.elements.rateLimits !== false
      ? await getUsage()
      : null;

    // Build render context
    const context: HudRenderContext = {
      contextPercent: getContextPercent(stdin),
      modelName: getModelName(stdin),
      ralph,
      ultrawork,
      prd,
      activeAgents: transcriptData.agents.filter((a) => a.status === 'running'),
      todos: transcriptData.todos,
      backgroundTasks: getRunningTasks(hudState),
      cwd,
      lastSkill: transcriptData.lastActivatedSkill || null,
      rateLimits,
    };

    // Render and output
    const output = render(context, config);

    // Replace spaces with non-breaking spaces for terminal alignment
    const formattedOutput = output.replace(/ /g, '\u00A0');
    console.log(formattedOutput);
  } catch (error) {
    // On any error, show minimal fallback
    console.log('[SISYPHUS] error');
  }
}

// Run main
main();
