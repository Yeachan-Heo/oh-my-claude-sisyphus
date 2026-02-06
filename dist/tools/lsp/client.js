/**
 * LSP Client Implementation
 *
 * Manages connections to language servers using JSON-RPC 2.0 over stdio.
 * Handles server lifecycle, message buffering, and request/response matching.
 */
import { spawn } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname, parse, join } from 'path';
import { getServerForFile, commandExists } from './servers.js';
/**
 * LSP Client class
 */
export class LspClient {
    process = null;
    requestId = 0;
    pendingRequests = new Map();
    buffer = '';
    openDocuments = new Set();
    diagnostics = new Map();
    workspaceRoot;
    serverConfig;
    initialized = false;
    constructor(workspaceRoot, serverConfig) {
        this.workspaceRoot = resolve(workspaceRoot);
        this.serverConfig = serverConfig;
    }
    /**
     * Start the LSP server and initialize the connection
     */
    async connect() {
        if (this.process) {
            return; // Already connected
        }
        if (!commandExists(this.serverConfig.command)) {
            throw new Error(`Language server '${this.serverConfig.command}' not found.\n` +
                `Install with: ${this.serverConfig.installHint}`);
        }
        return new Promise((resolve, reject) => {
            this.process = spawn(this.serverConfig.command, this.serverConfig.args, {
                cwd: this.workspaceRoot,
                stdio: ['pipe', 'pipe', 'pipe']
            });
            this.process.stdout?.on('data', (data) => {
                this.handleData(data.toString());
            });
            this.process.stderr?.on('data', (data) => {
                // Log stderr for debugging but don't fail
                console.error(`LSP stderr: ${data.toString()}`);
            });
            this.process.on('error', (error) => {
                reject(new Error(`Failed to start LSP server: ${error.message}`));
            });
            this.process.on('exit', (code) => {
                this.process = null;
                this.initialized = false;
                if (code !== 0) {
                    console.error(`LSP server exited with code ${code}`);
                }
            });
            // Send initialize request
            this.initialize()
                .then(() => {
                this.initialized = true;
                resolve();
            })
                .catch(reject);
        });
    }
    /**
     * Disconnect from the LSP server
     */
    async disconnect() {
        if (!this.process)
            return;
        try {
            await this.request('shutdown', null);
            this.notify('exit', null);
        }
        catch {
            // Ignore errors during shutdown
        }
        this.process.kill();
        this.process = null;
        this.initialized = false;
        this.pendingRequests.clear();
        this.openDocuments.clear();
        this.diagnostics.clear();
    }
    /**
     * Handle incoming data from the server
     */
    handleData(data) {
        this.buffer += data;
        while (true) {
            // Look for Content-Length header
            const headerEnd = this.buffer.indexOf('\r\n\r\n');
            if (headerEnd === -1)
                break;
            const header = this.buffer.slice(0, headerEnd);
            const contentLengthMatch = header.match(/Content-Length: (\d+)/i);
            if (!contentLengthMatch) {
                // Invalid header, try to recover
                this.buffer = this.buffer.slice(headerEnd + 4);
                continue;
            }
            const contentLength = parseInt(contentLengthMatch[1], 10);
            const messageStart = headerEnd + 4;
            const messageEnd = messageStart + contentLength;
            if (this.buffer.length < messageEnd) {
                break; // Not enough data yet
            }
            const messageJson = this.buffer.slice(messageStart, messageEnd);
            this.buffer = this.buffer.slice(messageEnd);
            try {
                const message = JSON.parse(messageJson);
                this.handleMessage(message);
            }
            catch {
                // Invalid JSON, skip
            }
        }
    }
    /**
     * Handle a parsed JSON-RPC message
     */
    handleMessage(message) {
        if ('id' in message && message.id !== undefined) {
            // Response to a request
            const pending = this.pendingRequests.get(message.id);
            if (pending) {
                clearTimeout(pending.timeout);
                this.pendingRequests.delete(message.id);
                if (message.error) {
                    pending.reject(new Error(message.error.message));
                }
                else {
                    pending.resolve(message.result);
                }
            }
        }
        else if ('method' in message) {
            // Notification from server
            this.handleNotification(message);
        }
    }
    /**
     * Handle server notifications
     */
    handleNotification(notification) {
        if (notification.method === 'textDocument/publishDiagnostics') {
            const params = notification.params;
            this.diagnostics.set(params.uri, params.diagnostics);
        }
        // Handle other notifications as needed
    }
    /**
     * Send a request to the server
     */
    async request(method, params, timeout = 15000) {
        if (!this.process?.stdin) {
            throw new Error('LSP server not connected');
        }
        const id = ++this.requestId;
        const request = {
            jsonrpc: '2.0',
            id,
            method,
            params
        };
        const content = JSON.stringify(request);
        const message = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`;
        return new Promise((resolve, reject) => {
            const timeoutHandle = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error(`LSP request '${method}' timed out after ${timeout}ms`));
            }, timeout);
            this.pendingRequests.set(id, {
                resolve: resolve,
                reject,
                timeout: timeoutHandle
            });
            this.process?.stdin?.write(message);
        });
    }
    /**
     * Send a notification to the server (no response expected)
     */
    notify(method, params) {
        if (!this.process?.stdin)
            return;
        const notification = {
            jsonrpc: '2.0',
            method,
            params
        };
        const content = JSON.stringify(notification);
        const message = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n${content}`;
        this.process.stdin.write(message);
    }
    /**
     * Initialize the LSP connection
     */
    async initialize() {
        await this.request('initialize', {
            processId: process.pid,
            rootUri: `file://${this.workspaceRoot}`,
            rootPath: this.workspaceRoot,
            capabilities: {
                textDocument: {
                    hover: { contentFormat: ['markdown', 'plaintext'] },
                    definition: { linkSupport: true },
                    references: {},
                    documentSymbol: { hierarchicalDocumentSymbolSupport: true },
                    codeAction: { codeActionLiteralSupport: { codeActionKind: { valueSet: [] } } },
                    rename: { prepareSupport: true }
                },
                workspace: {
                    symbol: {},
                    workspaceFolders: true
                }
            },
            initializationOptions: this.serverConfig.initializationOptions || {}
        });
        this.notify('initialized', {});
    }
    /**
     * Open a document for editing
     */
    async openDocument(filePath) {
        const uri = `file://${resolve(filePath)}`;
        if (this.openDocuments.has(uri))
            return;
        if (!existsSync(filePath)) {
            throw new Error(`File not found: ${filePath}`);
        }
        const content = readFileSync(filePath, 'utf-8');
        const languageId = this.getLanguageId(filePath);
        this.notify('textDocument/didOpen', {
            textDocument: {
                uri,
                languageId,
                version: 1,
                text: content
            }
        });
        this.openDocuments.add(uri);
        // Wait a bit for the server to process the document
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    /**
     * Close a document
     */
    closeDocument(filePath) {
        const uri = `file://${resolve(filePath)}`;
        if (!this.openDocuments.has(uri))
            return;
        this.notify('textDocument/didClose', {
            textDocument: { uri }
        });
        this.openDocuments.delete(uri);
    }
    /**
     * Get the language ID for a file
     */
    getLanguageId(filePath) {
        const ext = filePath.split('.').pop()?.toLowerCase() || '';
        const langMap = {
            'ts': 'typescript',
            'tsx': 'typescriptreact',
            'js': 'javascript',
            'jsx': 'javascriptreact',
            'mts': 'typescript',
            'cts': 'typescript',
            'mjs': 'javascript',
            'cjs': 'javascript',
            'py': 'python',
            'rs': 'rust',
            'go': 'go',
            'c': 'c',
            'h': 'c',
            'cpp': 'cpp',
            'cc': 'cpp',
            'hpp': 'cpp',
            'java': 'java',
            'json': 'json',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'yaml': 'yaml',
            'yml': 'yaml',
            'php': 'php',
            'phtml': 'php',
            'rb': 'ruby',
            'rake': 'ruby',
            'gemspec': 'ruby',
            'erb': 'ruby',
            'lua': 'lua',
            'kt': 'kotlin',
            'kts': 'kotlin',
            'ex': 'elixir',
            'exs': 'elixir',
            'heex': 'elixir',
            'eex': 'elixir',
            'cs': 'csharp'
        };
        return langMap[ext] || ext;
    }
    /**
     * Convert file path to URI and ensure document is open
     */
    async prepareDocument(filePath) {
        await this.openDocument(filePath);
        return `file://${resolve(filePath)}`;
    }
    // LSP Request Methods
    /**
     * Get hover information at a position
     */
    async hover(filePath, line, character) {
        const uri = await this.prepareDocument(filePath);
        return this.request('textDocument/hover', {
            textDocument: { uri },
            position: { line, character }
        });
    }
    /**
     * Go to definition
     */
    async definition(filePath, line, character) {
        const uri = await this.prepareDocument(filePath);
        return this.request('textDocument/definition', {
            textDocument: { uri },
            position: { line, character }
        });
    }
    /**
     * Find all references
     */
    async references(filePath, line, character, includeDeclaration = true) {
        const uri = await this.prepareDocument(filePath);
        return this.request('textDocument/references', {
            textDocument: { uri },
            position: { line, character },
            context: { includeDeclaration }
        });
    }
    /**
     * Get document symbols
     */
    async documentSymbols(filePath) {
        const uri = await this.prepareDocument(filePath);
        return this.request('textDocument/documentSymbol', {
            textDocument: { uri }
        });
    }
    /**
     * Search workspace symbols
     */
    async workspaceSymbols(query) {
        return this.request('workspace/symbol', { query });
    }
    /**
     * Get diagnostics for a file
     */
    getDiagnostics(filePath) {
        const uri = `file://${resolve(filePath)}`;
        return this.diagnostics.get(uri) || [];
    }
    /**
     * Prepare rename (check if rename is valid)
     */
    async prepareRename(filePath, line, character) {
        const uri = await this.prepareDocument(filePath);
        try {
            const result = await this.request('textDocument/prepareRename', {
                textDocument: { uri },
                position: { line, character }
            });
            if (!result)
                return null;
            return 'range' in result ? result.range : result;
        }
        catch {
            return null;
        }
    }
    /**
     * Rename a symbol
     */
    async rename(filePath, line, character, newName) {
        const uri = await this.prepareDocument(filePath);
        return this.request('textDocument/rename', {
            textDocument: { uri },
            position: { line, character },
            newName
        });
    }
    /**
     * Get code actions
     */
    async codeActions(filePath, range, diagnostics = []) {
        const uri = await this.prepareDocument(filePath);
        return this.request('textDocument/codeAction', {
            textDocument: { uri },
            range,
            context: { diagnostics }
        });
    }
}
/**
 * Client manager - maintains a pool of LSP clients per workspace/server
 */
class LspClientManager {
    clients = new Map();
    /**
     * Get or create a client for a file
     */
    async getClientForFile(filePath) {
        const serverConfig = getServerForFile(filePath);
        if (!serverConfig) {
            return null;
        }
        // Find workspace root
        const workspaceRoot = this.findWorkspaceRoot(filePath);
        const key = `${workspaceRoot}:${serverConfig.command}`;
        let client = this.clients.get(key);
        if (!client) {
            client = new LspClient(workspaceRoot, serverConfig);
            try {
                await client.connect();
                this.clients.set(key, client);
            }
            catch (error) {
                throw error;
            }
        }
        return client;
    }
    /**
     * Find the workspace root for a file
     */
    findWorkspaceRoot(filePath) {
        let dir = dirname(resolve(filePath));
        const markers = ['package.json', 'tsconfig.json', 'pyproject.toml', 'Cargo.toml', 'go.mod', '.git'];
        // Cross-platform root detection
        while (true) {
            const parsed = parse(dir);
            // On Windows: C:\ has root === dir, On Unix: / has root === dir
            if (parsed.root === dir) {
                break;
            }
            for (const marker of markers) {
                const markerPath = join(dir, marker);
                if (existsSync(markerPath)) {
                    return dir;
                }
            }
            dir = dirname(dir);
        }
        return dirname(resolve(filePath));
    }
    /**
     * Disconnect all clients
     */
    async disconnectAll() {
        for (const client of this.clients.values()) {
            await client.disconnect();
        }
        this.clients.clear();
    }
}
// Export a singleton instance
export const lspClientManager = new LspClientManager();
//# sourceMappingURL=client.js.map