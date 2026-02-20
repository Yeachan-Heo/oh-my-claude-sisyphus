/**
 * Hook Input Normalization
 *
 * Handles snake_case -> camelCase field mapping for Claude Code hook inputs.
 * Claude Code sends snake_case fields: tool_name, tool_input, tool_response,
 * session_id, cwd, hook_event_name. This module normalizes them to camelCase
 * with snake_case-first fallback.
 *
 * Uses Zod for structural validation to catch malformed inputs early.
 * Sensitive hooks use strict allowlists; others pass through unknown fields.
 */
import type { HookInput } from './bridge.js';
/** Schema for the common hook input structure (supports both snake_case and camelCase) */
declare const HookInputSchema: any;
/** Hooks where unknown fields are dropped (strict allowlist only) */
declare const SENSITIVE_HOOKS: Set<string>;
/** All known camelCase field names the system uses (post-normalization) */
declare const KNOWN_FIELDS: Set<string>;
/** Check if input is already camelCase-normalized and can skip Zod parsing */
declare function isAlreadyCamelCase(obj: Record<string, unknown>): boolean;
/**
 * Normalize hook input from Claude Code's snake_case format to the
 * camelCase HookInput interface used internally.
 *
 * Validates the input structure with Zod, then maps snake_case to camelCase.
 * Always reads snake_case first with camelCase fallback, per the
 * project convention documented in MEMORY.md.
 *
 * @param raw - Raw hook input (may be snake_case, camelCase, or mixed)
 * @param hookType - Optional hook type for sensitivity-aware filtering
 */
export declare function normalizeHookInput(raw: unknown, hookType?: string): HookInput;
export { SENSITIVE_HOOKS, KNOWN_FIELDS, isAlreadyCamelCase, HookInputSchema };
//# sourceMappingURL=bridge-normalize.d.ts.map