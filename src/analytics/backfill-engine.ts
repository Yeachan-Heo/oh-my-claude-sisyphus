import { EventEmitter } from 'events';
import * as path from 'path';
import { scanTranscripts, TranscriptFile } from './transcript-scanner.js';
import { parseTranscript } from './transcript-parser.js';
import type { TranscriptEntry, TokenUsage } from './types.js';
import { BackfillDedup } from './backfill-dedup.js';
import { TokenTracker, getTokenTracker } from './token-tracker.js';
import { calculateCost } from './cost-estimator.js';
import { extractTokenUsage, extractTaskSpawns, extractAgentIdMapping } from './transcript-token-extractor.js';

export interface BackfillOptions {
  projectFilter?: string;
  dateFrom?: Date;
  dateTo?: Date;
  dryRun?: boolean;
  verbose?: boolean;
}

export interface BackfillResult {
  filesProcessed: number;
  entriesAdded: number;
  duplicatesSkipped: number;
  errorsEncountered: number;
  totalCostDiscovered: number;
  timeElapsed: number;
}

export interface BackfillProgress {
  currentFile: string;
  filesProcessed: number;
  totalFiles: number;
  entriesAdded: number;
  duplicatesSkipped: number;
  currentCost: number;
}

/**
 * BackfillEngine orchestrates the offline transcript analysis pipeline.
 *
 * Pipeline:
 * 1. Scan for transcripts
 * 2. Parse each transcript file (streaming)
 * 3. Extract token usage from entries
 * 4. Deduplicate
 * 5. Write to token-tracking.jsonl (batch)
 *
 * Emits 'progress' events during execution.
 */
export class BackfillEngine extends EventEmitter {
  private aborted: boolean = false;
  private dedup: BackfillDedup;
  private tracker: TokenTracker;

  constructor() {
    super();
    this.dedup = new BackfillDedup();
    this.tracker = getTokenTracker();
  }

  /**
   * Abort the backfill operation
   */
  abort(): void {
    this.aborted = true;
  }

  /**
   * Run the backfill process
   */
  async run(options: BackfillOptions = {}): Promise<BackfillResult> {
    const startTime = Date.now();
    this.aborted = false;

    // Load deduplication state
    await this.dedup.load();

    // Scan for transcripts
    const scanResult = await scanTranscripts({
      projectFilter: options.projectFilter,
      minDate: options.dateFrom,
    });

    const result: BackfillResult = {
      filesProcessed: 0,
      entriesAdded: 0,
      duplicatesSkipped: 0,
      errorsEncountered: 0,
      totalCostDiscovered: 0,
      timeElapsed: 0,
    };

    // Separate main session files from subagent files
    const mainTranscripts = scanResult.transcripts.filter(t => !t.isSubagent);
    const subagentTranscripts = scanResult.transcripts.filter(t => t.isSubagent);
    const totalFiles = scanResult.transcripts.length;

    // Global mapping of agentId → agentType, built from main session progress entries
    const agentIdMap = new Map<string, string>();

    // Phase 1: Process main session files first to build agentId mappings
    for (const transcript of mainTranscripts) {
      if (this.aborted) break;

      if (options.dateTo && transcript.modifiedTime > options.dateTo) {
        continue;
      }

      try {
        await this.processTranscript(transcript, options, result, totalFiles, undefined, agentIdMap);
      } catch (error) {
        result.errorsEncountered++;
        if (options.verbose) {
          console.error(`Error processing ${transcript.filePath}:`, error);
        }
      }

      result.filesProcessed++;
    }

    // Phase 2: Process subagent files using the agentId → agentType mapping
    for (const transcript of subagentTranscripts) {
      if (this.aborted) break;

      if (options.dateTo && transcript.modifiedTime > options.dateTo) {
        continue;
      }

      // Look up the agent type for this subagent file
      const agentType = transcript.agentId ? agentIdMap.get(transcript.agentId) : undefined;

      try {
        await this.processTranscript(transcript, options, result, totalFiles, agentType);
      } catch (error) {
        result.errorsEncountered++;
        if (options.verbose) {
          console.error(`Error processing ${transcript.filePath}:`, error);
        }
      }

      result.filesProcessed++;
    }

    // Save deduplication state
    if (!options.dryRun) {
      await this.dedup.save();
    }

    result.timeElapsed = Date.now() - startTime;
    return result;
  }

  /**
   * Process a single transcript file
   *
   * @param transcript - Transcript file metadata
   * @param options - Backfill options
   * @param result - Accumulating result object
   * @param totalFiles - Total number of files being processed
   * @param overrideAgentName - For subagent files, the known agent type
   * @param agentIdMap - Map to populate with agentId → agentType (for main sessions)
   */
  private async processTranscript(
    transcript: TranscriptFile,
    options: BackfillOptions,
    result: BackfillResult,
    totalFiles: number,
    overrideAgentName?: string,
    agentIdMap?: Map<string, string>
  ): Promise<void> {
    const batch: TokenUsage[] = [];
    const BATCH_SIZE = 100;

    // Build a lookup of toolUseId → agentType for attributing progress entries
    // This is populated as we encounter assistant entries with Task tool calls
    const agentLookup = new Map<string, string>();

    // Emit progress
    this.emit('progress', {
      currentFile: path.basename(transcript.filePath),
      filesProcessed: result.filesProcessed,
      totalFiles,
      entriesAdded: result.entriesAdded,
      duplicatesSkipped: result.duplicatesSkipped,
      currentCost: result.totalCostDiscovered,
    } as BackfillProgress);

    // Parse transcript (streaming)
    for await (const entry of parseTranscript(transcript.filePath, {
      onParseError: (line, error) => {
        result.errorsEncountered++;
        if (options.verbose) {
          console.warn(`Parse error in ${transcript.filePath}: ${error.message}`);
        }
      },
    })) {
      if (this.aborted) {
        break;
      }

      // Extract Task tool spawns from assistant entries to build agent lookup
      // This must happen BEFORE extractTokenUsage so progress entries can look up their parent
      const spawns = extractTaskSpawns(entry);
      for (const spawn of spawns) {
        agentLookup.set(spawn.toolUseId, spawn.agentType);
      }

      // Build agentId → agentType mapping from progress entries
      // This correlates the agentId (used in subagent log filenames) with
      // the agentType (from Task tool calls in the main session)
      if (agentIdMap) {
        const mapping = extractAgentIdMapping(entry, agentLookup);
        if (mapping) {
          agentIdMap.set(mapping.agentId, mapping.agentType);
        }
      }

      // Extract token usage (passing agentLookup for progress entry attribution)
      const extracted = extractTokenUsage(entry, transcript.sessionId, transcript.filePath, agentLookup, overrideAgentName);

      if (!extracted) {
        continue; // Skip entries without usage data
      }

      // Check deduplication
      if (this.dedup.isProcessed(extracted.entryId)) {
        result.duplicatesSkipped++;
        continue;
      }

      // Calculate cost
      const cost = calculateCost({
        modelName: extracted.usage.modelName,
        inputTokens: extracted.usage.inputTokens,
        outputTokens: extracted.usage.outputTokens,
        cacheCreationTokens: extracted.usage.cacheCreationTokens,
        cacheReadTokens: extracted.usage.cacheReadTokens,
      });

      result.totalCostDiscovered += cost.totalCost;

      // Add to batch
      batch.push(extracted.usage);
      this.dedup.markProcessed(extracted.entryId);
      result.entriesAdded++;

      // Flush batch if full
      if (batch.length >= BATCH_SIZE && !options.dryRun) {
        await this.flushBatch(batch);
      }
    }

    // Flush remaining entries
    if (batch.length > 0 && !options.dryRun) {
      await this.flushBatch(batch);
    }
  }

  /**
   * Write a batch of token usage entries to the tracker
   */
  private async flushBatch(batch: TokenUsage[]): Promise<void> {
    for (const usage of batch) {
      await this.tracker.recordTokenUsage({
        modelName: usage.modelName,
        inputTokens: usage.inputTokens,
        outputTokens: usage.outputTokens,
        cacheCreationTokens: usage.cacheCreationTokens,
        cacheReadTokens: usage.cacheReadTokens,
        agentName: usage.agentName,
        isEstimated: usage.isEstimated,
      });
    }
    batch.length = 0; // Clear batch
  }
}
