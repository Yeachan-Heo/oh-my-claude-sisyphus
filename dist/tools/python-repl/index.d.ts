/**
 * Python REPL Tool - Persistent Python execution environment
 *
 * Provides a persistent Python REPL with variable persistence across
 * tool invocations, session locking, and structured output markers.
 */
import { pythonReplHandler } from './tool.js';
export declare const pythonReplTool: {
    name: string;
    description: string;
    schema: any;
    handler: typeof pythonReplHandler;
};
export * from './types.js';
export { pythonReplSchema, pythonReplHandler } from './tool.js';
//# sourceMappingURL=index.d.ts.map