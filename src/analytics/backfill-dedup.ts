import { createHash } from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';
import { homedir } from 'os';
import { TokenUsage } from './types.js';

const TOKEN_LOG_FILE = path.join(homedir(), '.omc', 'state', 'token-tracking.jsonl');
const DEDUP_INDEX_FILE = path.join(homedir(), '.omc', 'state', 'backfill-index.json');

export interface DedupIndex {
  processedIds: string[];  // Serialized from Set
  lastBackfillTime: string;
  totalProcessed: number;
}

/**
 * BackfillDedup provides fast deduplication for backfill operations.
 *
 * Uses in-memory Set for O(1) lookups and persists state to disk.
 * Loads existing entries from token-tracking.jsonl on initialization.
 */
export class BackfillDedup {
  private processedSet: Set<string> = new Set();
  private totalProcessed: number = 0;
  private lastBackfillTime: string = new Date().toISOString();

  /**
   * Load existing processed IDs from backfill-index.json and scan token-tracking.jsonl
   */
  async load(): Promise<void> {
    // Load persisted index first
    try {
      const indexContent = await fs.readFile(DEDUP_INDEX_FILE, 'utf-8');
      const index: DedupIndex = JSON.parse(indexContent);

      this.processedSet = new Set(index.processedIds);
      this.totalProcessed = index.totalProcessed;
      this.lastBackfillTime = index.lastBackfillTime;
    } catch (_error) {
      // Index doesn't exist yet, will be created on save
    }

    // Scan token-tracking.jsonl to ensure all existing entries are marked
    try {
      const logContent = await fs.readFile(TOKEN_LOG_FILE, 'utf-8');
      const lines = logContent.trim().split('\n').filter(line => line.length > 0);

      for (const line of lines) {
        try {
          const record: TokenUsage = JSON.parse(line);
          const entryId = this.generateEntryId(record);

          if (!this.processedSet.has(entryId)) {
            this.processedSet.add(entryId);
            this.totalProcessed++;
          }
        } catch (_parseError) {
          // Skip malformed lines
        }
      }
    } catch (_error) {
      // Log file doesn't exist yet, which is fine
    }
  }

  /**
   * Generate unique ID for a token usage entry
   * Uses SHA256 hash to match transcript-token-extractor.ts format
   */
  private generateEntryId(record: TokenUsage): string {
    const hash = createHash('sha256');
    hash.update(`${record.sessionId}:${record.timestamp}:${record.modelName}`);
    return hash.digest('hex');
  }

  /**
   * Check if an entry ID has already been processed
   */
  isProcessed(entryId: string): boolean {
    return this.processedSet.has(entryId);
  }

  /**
   * Mark an entry ID as processed
   */
  markProcessed(entryId: string): void {
    if (!this.processedSet.has(entryId)) {
      this.processedSet.add(entryId);
      this.totalProcessed++;
    }
  }

  /**
   * Persist deduplication state to backfill-index.json
   */
  async save(): Promise<void> {
    const indexDir = path.dirname(DEDUP_INDEX_FILE);

    await fs.mkdir(indexDir, { recursive: true });

    const index: DedupIndex = {
      processedIds: Array.from(this.processedSet),
      lastBackfillTime: new Date().toISOString(),
      totalProcessed: this.totalProcessed
    };

    await fs.writeFile(DEDUP_INDEX_FILE, JSON.stringify(index, null, 2), 'utf-8');
  }

  /**
   * Clear all processed entries and delete index file
   */
  async reset(): Promise<void> {
    this.processedSet.clear();
    this.totalProcessed = 0;
    this.lastBackfillTime = new Date().toISOString();

    try {
      await fs.unlink(DEDUP_INDEX_FILE);
    } catch (_error) {
      // File might not exist, which is fine
    }
  }

  /**
   * Get current statistics
   */
  getStats(): { totalProcessed: number; lastBackfillTime: string } {
    return {
      totalProcessed: this.totalProcessed,
      lastBackfillTime: this.lastBackfillTime
    };
  }
}
