/**
 * Session Registry Module
 *
 * Maps platform message IDs to tmux pane IDs for reply correlation.
 * Uses JSONL append format for atomic writes, following the pattern from
 * session-replay.ts with secure file permissions from daemon.ts.
 *
 * Registry location: ~/.omc/state/reply-session-registry.jsonl (global, not worktree-local)
 * File permissions: 0600 (owner read/write only)
 */
export interface SessionMapping {
    platform: "discord-bot" | "telegram";
    messageId: string;
    sessionId: string;
    tmuxPaneId: string;
    tmuxSessionName: string;
    event: string;
    createdAt: string;
    projectPath?: string;
}
/**
 * Register a message mapping (atomic JSONL append).
 *
 * Uses O_WRONLY | O_APPEND | O_CREAT for atomic appends (up to PIPE_BUF bytes on Linux).
 * Each mapping serializes to well under 4096 bytes, making this operation atomic.
 */
export declare function registerMessage(mapping: SessionMapping): void;
/**
 * Load all mappings from the JSONL file
 */
export declare function loadAllMappings(): SessionMapping[];
/**
 * Look up a mapping by platform and message ID.
 * Returns the first match (most recent entry wins if duplicates exist).
 */
export declare function lookupByMessageId(platform: string, messageId: string): SessionMapping | null;
/**
 * Remove all entries for a given session ID.
 * This is a rewrite operation (infrequent - only on session-end).
 */
export declare function removeSession(sessionId: string): void;
/**
 * Remove all entries for a given pane ID.
 * Called by reply listener when pane verification fails (stale pane cleanup).
 */
export declare function removeMessagesByPane(paneId: string): void;
/**
 * Remove entries older than MAX_AGE_MS (24 hours).
 * This is a rewrite operation (infrequent - called periodically by daemon).
 */
export declare function pruneStale(): void;
//# sourceMappingURL=session-registry.d.ts.map