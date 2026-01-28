/**
 * Shared constants for diagnostics module.
 * Extracted to break circular dependency between index.ts and runners.
 */

/** Timeout for external process execution (5 minutes) */
export const EXTERNAL_PROCESS_TIMEOUT_MS = 300000;

/** Wait time for LSP diagnostics to be published */
export const LSP_DIAGNOSTICS_WAIT_MS = 300;
