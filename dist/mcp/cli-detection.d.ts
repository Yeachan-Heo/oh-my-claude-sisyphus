export * from '../team/cli-detection.js';
export interface CliDetectionResult {
    available: boolean;
    path?: string;
    version?: string;
    error?: string;
    installHint: string;
}
/**
 * @deprecated Use isCliAvailable('codex') from src/team/cli-detection.ts instead
 */
export declare function detectCodexCli(useCache?: boolean): CliDetectionResult;
/**
 * @deprecated Use isCliAvailable('gemini') from src/team/cli-detection.ts instead
 */
export declare function detectGeminiCli(useCache?: boolean): CliDetectionResult;
/**
 * Reset detection cache (useful for testing)
 * @deprecated Use detectCli() from src/team/cli-detection.ts which has no cache
 */
export declare function resetDetectionCache(): void;
//# sourceMappingURL=cli-detection.d.ts.map