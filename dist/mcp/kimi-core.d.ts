/**
 * Kimi MCP Core - Shared business logic for Kimi-CLI integration
 *
 * This module contains all the business logic for the Kimi-CLI integration.
 */
export declare const KIMI_DEFAULT_MODEL: string;
export declare const KIMI_TIMEOUT: number;
/**
 * Detect if Kimi-CLI is installed and available
 */
export declare function detectKimiCli(): string | null;
/**
 * Run a prompt with Kimi-CLI
 */
export declare function runKimiPrompt(options: {
    prompt: string;
    model?: string;
    files?: string[];
    workingDirectory?: string;
}): Promise<{
    success: boolean;
    result?: string;
    error?: string;
}>;
//# sourceMappingURL=kimi-core.d.ts.map