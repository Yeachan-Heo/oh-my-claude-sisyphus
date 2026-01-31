/**
 * OMC HUD - CWD Element
 *
 * Renders current working directory relative to home.
 */

import { homedir } from 'node:os';
import { dim } from '../colors.js';

/**
 * Render current working directory.
 *
 * Converts absolute path to ~-relative format.
 * Example: /Users/dat/workspace/dotfiles -> ~/workspace/dotfiles
 *
 * @param cwd - Absolute path to current working directory
 * @returns Formatted path string or null if empty
 */
export function renderCwd(cwd: string | undefined): string | null {
  if (!cwd) return null;

  const home = homedir();

  // Convert to ~-relative if under home directory
  const displayPath = cwd.startsWith(home)
    ? '~' + cwd.slice(home.length)
    : cwd;

  return `${dim(displayPath)}`;
}
