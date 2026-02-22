import { mkdir, appendFile } from 'fs/promises';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Send a short trigger to a worker via tmux send-keys.
 * Uses literal mode (-l) to avoid stdin buffer interference.
 * Message MUST be < 200 chars.
 * Returns false on error — never throws.
 * File state is written BEFORE this is called (write-then-notify pattern).
 */
export async function sendTmuxTrigger(
  paneId: string,
  triggerType: string,
  payload?: string
): Promise<boolean> {
  const message = payload ? `${triggerType}:${payload}` : triggerType;
  const truncated = message.length > 200 ? message.slice(0, 200) : message;
  try {
    await execFileAsync('tmux', ['send-keys', '-t', paneId, '-l', truncated]);
    await execFileAsync('tmux', ['send-keys', '-t', paneId, 'Enter']);
    return true;
  } catch {
    return false;
  }
}

/**
 * Write an instruction to a worker inbox, then send tmux trigger.
 * Write-then-notify: file is written first, trigger is sent after.
 * Notified flag set only on successful trigger.
 */
export async function queueInboxInstruction(
  teamName: string,
  workerName: string,
  instruction: string,
  paneId: string,
  cwd: string
): Promise<void> {
  const inboxPath = join(cwd, `.omc/state/team/${teamName}/workers/${workerName}/inbox.md`);
  await mkdir(join(inboxPath, '..'), { recursive: true });

  // Write FIRST (write-then-notify)
  const entry = `\n\n---\n${instruction}\n_queued: ${new Date().toISOString()}_\n`;
  await appendFile(inboxPath, entry, 'utf-8');

  // Notify AFTER write
  await sendTmuxTrigger(paneId, 'check-inbox');
}

/**
 * Send a direct message from one worker to another.
 * Write to mailbox first, then send tmux trigger to recipient.
 */
export async function queueDirectMessage(
  teamName: string,
  fromWorker: string,
  toWorker: string,
  body: string,
  toPaneId: string,
  cwd: string
): Promise<void> {
  const mailboxPath = join(cwd, `.omc/state/team/${teamName}/mailbox/${toWorker}.jsonl`);
  await mkdir(join(mailboxPath, '..'), { recursive: true });

  const message = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    from: fromWorker,
    to: toWorker,
    body,
    createdAt: new Date().toISOString(),
    notifiedAt: null as string | null,
  };

  // Write FIRST
  await appendFile(mailboxPath, JSON.stringify(message) + '\n', 'utf-8');

  // Update notifiedAt after successful trigger
  const notified = await sendTmuxTrigger(toPaneId, 'new-message', fromWorker);
  if (notified) {
    message.notifiedAt = new Date().toISOString();
    // Re-append updated entry (append-only log; reader uses last entry per id)
    await appendFile(mailboxPath, JSON.stringify({ ...message, type: 'notified' }) + '\n', 'utf-8');
  }
}

/**
 * Broadcast a message to all workers.
 * Write to each mailbox first, then send triggers.
 */
export async function queueBroadcastMessage(
  teamName: string,
  fromWorker: string,
  body: string,
  workerPanes: Record<string, string>, // workerName -> paneId
  cwd: string
): Promise<void> {
  const workerNames = Object.keys(workerPanes);

  // Write to all mailboxes FIRST
  const messageId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  for (const toWorker of workerNames) {
    const mailboxPath = join(cwd, `.omc/state/team/${teamName}/mailbox/${toWorker}.jsonl`);
    await mkdir(join(mailboxPath, '..'), { recursive: true });
    const message = {
      id: messageId,
      from: fromWorker,
      to: toWorker,
      body,
      createdAt: new Date().toISOString(),
      broadcast: true,
    };
    await appendFile(mailboxPath, JSON.stringify(message) + '\n', 'utf-8');
  }

  // Send triggers to all (best-effort)
  await Promise.all(
    workerNames.map(toWorker =>
      sendTmuxTrigger(workerPanes[toWorker], 'new-message', fromWorker)
    )
  );
}

/**
 * Read unread messages from a worker mailbox.
 * Returns messages since the given cursor (message ID or timestamp).
 */
export async function readMailbox(
  teamName: string,
  workerName: string,
  cwd: string
): Promise<Array<{ id: string; from: string; body: string; createdAt: string }>> {
  const mailboxPath = join(cwd, `.omc/state/team/${teamName}/mailbox/${workerName}.jsonl`);
  try {
    const { readFile } = await import('fs/promises');
    const content = await readFile(mailboxPath, 'utf-8');
    const lines = content.trim().split('\n').filter(Boolean);
    const seen = new Set<string>();
    const messages: Array<{ id: string; from: string; body: string; createdAt: string }> = [];
    for (const line of lines) {
      try {
        const msg = JSON.parse(line) as { id: string; from: string; body: string; createdAt: string; type?: string };
        if (msg.type === 'notified') continue; // skip notification acks
        if (!seen.has(msg.id)) {
          seen.add(msg.id);
          messages.push({ id: msg.id, from: msg.from, body: msg.body, createdAt: msg.createdAt });
        }
      } catch { /* skip malformed lines */ }
    }
    return messages;
  } catch {
    return [];
  }
}
