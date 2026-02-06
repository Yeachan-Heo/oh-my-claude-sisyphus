/**
 * LSP Client Implementation
 *
 * Manages connections to language servers using JSON-RPC 2.0 over stdio.
 * Handles server lifecycle, message buffering, and request/response matching.
 */
import type { LspServerConfig } from './servers.js';
export interface Position {
    line: number;
    character: number;
}
export interface Range {
    start: Position;
    end: Position;
}
export interface Location {
    uri: string;
    range: Range;
}
export interface TextDocumentIdentifier {
    uri: string;
}
export interface TextDocumentPositionParams {
    textDocument: TextDocumentIdentifier;
    position: Position;
}
export interface Hover {
    contents: string | {
        kind: string;
        value: string;
    } | Array<string | {
        kind: string;
        value: string;
    }>;
    range?: Range;
}
export interface Diagnostic {
    range: Range;
    severity?: number;
    code?: string | number;
    source?: string;
    message: string;
}
export interface DocumentSymbol {
    name: string;
    kind: number;
    range: Range;
    selectionRange: Range;
    children?: DocumentSymbol[];
}
export interface SymbolInformation {
    name: string;
    kind: number;
    location: Location;
    containerName?: string;
}
export interface WorkspaceEdit {
    changes?: Record<string, Array<{
        range: Range;
        newText: string;
    }>>;
    documentChanges?: Array<{
        textDocument: TextDocumentIdentifier;
        edits: Array<{
            range: Range;
            newText: string;
        }>;
    }>;
}
export interface CodeAction {
    title: string;
    kind?: string;
    diagnostics?: Diagnostic[];
    isPreferred?: boolean;
    edit?: WorkspaceEdit;
    command?: {
        title: string;
        command: string;
        arguments?: unknown[];
    };
}
/**
 * LSP Client class
 */
export declare class LspClient {
    private process;
    private requestId;
    private pendingRequests;
    private buffer;
    private openDocuments;
    private diagnostics;
    private workspaceRoot;
    private serverConfig;
    private initialized;
    constructor(workspaceRoot: string, serverConfig: LspServerConfig);
    /**
     * Start the LSP server and initialize the connection
     */
    connect(): Promise<void>;
    /**
     * Disconnect from the LSP server
     */
    disconnect(): Promise<void>;
    /**
     * Handle incoming data from the server
     */
    private handleData;
    /**
     * Handle a parsed JSON-RPC message
     */
    private handleMessage;
    /**
     * Handle server notifications
     */
    private handleNotification;
    /**
     * Send a request to the server
     */
    private request;
    /**
     * Send a notification to the server (no response expected)
     */
    private notify;
    /**
     * Initialize the LSP connection
     */
    private initialize;
    /**
     * Open a document for editing
     */
    openDocument(filePath: string): Promise<void>;
    /**
     * Close a document
     */
    closeDocument(filePath: string): void;
    /**
     * Get the language ID for a file
     */
    private getLanguageId;
    /**
     * Convert file path to URI and ensure document is open
     */
    private prepareDocument;
    /**
     * Get hover information at a position
     */
    hover(filePath: string, line: number, character: number): Promise<Hover | null>;
    /**
     * Go to definition
     */
    definition(filePath: string, line: number, character: number): Promise<Location | Location[] | null>;
    /**
     * Find all references
     */
    references(filePath: string, line: number, character: number, includeDeclaration?: boolean): Promise<Location[] | null>;
    /**
     * Get document symbols
     */
    documentSymbols(filePath: string): Promise<DocumentSymbol[] | SymbolInformation[] | null>;
    /**
     * Search workspace symbols
     */
    workspaceSymbols(query: string): Promise<SymbolInformation[] | null>;
    /**
     * Get diagnostics for a file
     */
    getDiagnostics(filePath: string): Diagnostic[];
    /**
     * Prepare rename (check if rename is valid)
     */
    prepareRename(filePath: string, line: number, character: number): Promise<Range | null>;
    /**
     * Rename a symbol
     */
    rename(filePath: string, line: number, character: number, newName: string): Promise<WorkspaceEdit | null>;
    /**
     * Get code actions
     */
    codeActions(filePath: string, range: Range, diagnostics?: Diagnostic[]): Promise<CodeAction[] | null>;
}
/**
 * Client manager - maintains a pool of LSP clients per workspace/server
 */
declare class LspClientManager {
    private clients;
    /**
     * Get or create a client for a file
     */
    getClientForFile(filePath: string): Promise<LspClient | null>;
    /**
     * Find the workspace root for a file
     */
    private findWorkspaceRoot;
    /**
     * Disconnect all clients
     */
    disconnectAll(): Promise<void>;
}
export declare const lspClientManager: LspClientManager;
export {};
//# sourceMappingURL=client.d.ts.map