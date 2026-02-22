/**
 * Send a short trigger to a worker via tmux send-keys.
 * Uses literal mode (-l) to avoid stdin buffer interference.
 * Message MUST be < 200 chars.
 * Returns false on error — never throws.
 * File state is written BEFORE this is called (write-then-notify pattern).
 */
export declare function sendTmuxTrigger(paneId: string, triggerType: string, payload?: string): Promise<boolean>;
/**
 * Write an instruction to a worker inbox, then send tmux trigger.
 * Write-then-notify: file is written first, trigger is sent after.
 * Notified flag set only on successful trigger.
 */
export declare function queueInboxInstruction(teamName: string, workerName: string, instruction: string, paneId: string, cwd: string): Promise<void>;
/**
 * Send a direct message from one worker to another.
 * Write to mailbox first, then send tmux trigger to recipient.
 */
export declare function queueDirectMessage(teamName: string, fromWorker: string, toWorker: string, body: string, toPaneId: string, cwd: string): Promise<void>;
/**
 * Broadcast a message to all workers.
 * Write to each mailbox first, then send triggers.
 */
export declare function queueBroadcastMessage(teamName: string, fromWorker: string, body: string, workerPanes: Record<string, string>, // workerName -> paneId
cwd: string): Promise<void>;
/**
 * Read unread messages from a worker mailbox.
 * Returns messages since the given cursor (message ID or timestamp).
 */
export declare function readMailbox(teamName: string, workerName: string, cwd: string): Promise<Array<{
    id: string;
    from: string;
    body: string;
    createdAt: string;
}>>;
//# sourceMappingURL=tmux-comm.d.ts.map