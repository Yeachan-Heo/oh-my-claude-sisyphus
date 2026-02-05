import type {
  SessionBackend,
  SessionTarget,
  BackendPriority,
  SpawnOptions,
  CaptureAnalysis,
} from "./types.js";
import { TmuxBackend } from "./backends/tmux.js";
import { ProcessBackend } from "./backends/process.js";

export class SessionManager implements SessionBackend {
  readonly name = "session-manager";
  private static instance: SessionManager | null = null;
  private backends: SessionBackend[];
  private activeBackend: SessionBackend;

  private constructor(preferred?: BackendPriority) {
    this.backends = [new TmuxBackend(), new ProcessBackend()];
    this.activeBackend = this.selectBackend(preferred);
  }

  static getInstance(preferred?: BackendPriority): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager(preferred);
    }
    return SessionManager.instance;
  }

  getActiveBackend(): SessionBackend {
    return this.activeBackend;
  }

  getAvailableBackends(): SessionBackend[] {
    return this.backends.filter((backend) => backend.isAvailable());
  }

  switchBackend(name: string): boolean {
    const backend = this.backends.find(
      (candidate) => candidate.name === name && candidate.isAvailable(),
    );

    if (!backend) {
      return false;
    }

    this.activeBackend = backend;
    return true;
  }

  isAvailable(): boolean {
    return this.activeBackend.isAvailable();
  }

  getCapabilities() {
    return this.activeBackend.getCapabilities();
  }

  listTargets(): SessionTarget[] {
    return this.activeBackend.listTargets();
  }

  capture(targetId: string, lines?: number): string {
    return this.activeBackend.capture(targetId, lines);
  }

  analyze?(targetId: string, lines?: number): CaptureAnalysis {
    const backend = this.activeBackend as SessionBackend & {
      analyze?: (id: string, count?: number) => CaptureAnalysis;
    };

    if (!backend.analyze) {
      return {
        content: this.activeBackend.capture(targetId, lines),
        hasClaudeCode: false,
        hasRateLimitMessage: false,
        isBlocked: false,
        confidence: 0,
      };
    }

    return backend.analyze(targetId, lines);
  }

  send(targetId: string, text: string, pressEnter?: boolean): boolean {
    return this.activeBackend.send(targetId, text, pressEnter);
  }

  sendResume(targetId: string): boolean {
    return this.activeBackend.sendResume(targetId);
  }

  spawn(command: string, options?: SpawnOptions): SessionTarget | null {
    if (!this.activeBackend.spawn) {
      return null;
    }

    return this.activeBackend.spawn(command, options) ?? null;
  }

  private selectBackend(preferred?: BackendPriority): SessionBackend {
    const available = this.getAvailableBackends();

    if (preferred) {
      const preferredBackend = available.find(
        (backend) => backend.name === preferred,
      );
      if (preferredBackend) {
        return preferredBackend;
      }
    }

    const tmuxBackend = available.find((backend) => backend.name === "tmux");
    if (tmuxBackend) {
      return tmuxBackend;
    }

    return available[0] ?? new ProcessBackend();
  }
}
