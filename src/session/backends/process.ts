import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import type {
  BackendCapabilities,
  SessionBackend,
  SessionTarget,
  SpawnOptions,
} from "../types.js";

interface ProcessRecord {
  id: string;
  command: string;
  session: string;
  title?: string;
  process: ChildProcessWithoutNullStreams;
  stdoutLines: string[];
  stdoutRemainder: string;
  bufferSize: number;
  startedAt: Date;
}

const DEFAULT_BUFFER_SIZE = 500;

function mergeEnv(extra?: Record<string, string>): Record<string, string> {
  const merged: Record<string, string> = {};

  for (const [key, value] of Object.entries(process.env)) {
    if (typeof value === "string") {
      merged[key] = value;
    }
  }

  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      merged[key] = value;
    }
  }

  return merged;
}

export class ProcessBackend implements SessionBackend {
  readonly name = "process";
  private processes = new Map<string, ProcessRecord>();
  private counter = 0;

  isAvailable(): boolean {
    return true;
  }

  getCapabilities(): BackendCapabilities {
    return {
      canList: true,
      canCapture: true,
      canSend: true,
      canSpawn: true,
      supportsMultiple: true,
    };
  }

  listTargets(): SessionTarget[] {
    return Array.from(this.processes.values()).map((record) => ({
      id: record.id,
      type: "process",
      session: record.session,
      title: record.title ?? record.command,
      isActive: record.process.exitCode === null,
      metadata: {
        pid: record.process.pid,
        startedAt: record.startedAt.toISOString(),
      },
    }));
  }

  capture(targetId: string, lines = 15): string {
    const record = this.processes.get(targetId);
    if (!record) {
      return "";
    }

    const buffer = [...record.stdoutLines];
    if (record.stdoutRemainder.trim()) {
      buffer.push(record.stdoutRemainder);
    }

    return buffer.slice(-lines).join("\n");
  }

  send(targetId: string, text: string, pressEnter = true): boolean {
    const record = this.processes.get(targetId);
    if (!record || record.process.stdin.destroyed) {
      return false;
    }

    const payload = pressEnter ? `${text}\n` : text;
    record.process.stdin.write(payload);
    return true;
  }

  sendResume(targetId: string): boolean {
    const record = this.processes.get(targetId);
    if (!record || record.process.stdin.destroyed) {
      return false;
    }

    record.process.stdin.write("1\n");
    return true;
  }

  spawn(command: string, options?: SpawnOptions): SessionTarget | null {
    const id = `process-${this.counter++}`;
    const session = options?.session ?? "process";
    const title = options?.name;
    const env = mergeEnv(options?.env);

    const child = spawn(command, {
      cwd: options?.cwd,
      env,
      shell: true,
      stdio: "pipe",
    });

    const record: ProcessRecord = {
      id,
      command,
      session,
      title,
      process: child,
      stdoutLines: [],
      stdoutRemainder: "",
      bufferSize: DEFAULT_BUFFER_SIZE,
      startedAt: new Date(),
    };

    child.stdout.on("data", (chunk: Buffer) => {
      this.appendOutput(record, chunk);
    });

    child.on("exit", () => {
      this.processes.delete(id);
    });

    this.processes.set(id, record);

    return {
      id,
      type: "process",
      session,
      title: title ?? command,
      isActive: true,
      metadata: {
        pid: child.pid,
      },
    };
  }

  cleanup(): void {
    for (const record of this.processes.values()) {
      record.process.kill();
    }
    this.processes.clear();
  }

  private appendOutput(record: ProcessRecord, chunk: Buffer): void {
    const text = record.stdoutRemainder + chunk.toString("utf-8");
    const parts = text.split(/\r?\n/);
    record.stdoutRemainder = parts.pop() ?? "";
    record.stdoutLines.push(...parts);
    this.trimBuffer(record);
  }

  private trimBuffer(record: ProcessRecord): void {
    if (record.stdoutLines.length <= record.bufferSize) {
      return;
    }
    const excess = record.stdoutLines.length - record.bufferSize;
    record.stdoutLines.splice(0, excess);
  }
}
