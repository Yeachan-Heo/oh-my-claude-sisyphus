/**
 * OMC Tools Server - In-process MCP server for custom tools
 *
 * Exposes 18 custom tools (12 LSP, 2 AST, 1 python_repl, 3 skills) via the Claude Agent SDK's
 * createSdkMcpServer helper for use by subagents.
 */
import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { lspTools } from "../tools/lsp-tools.js";
import { astTools } from "../tools/ast-tools.js";
import { pythonReplTool } from "../tools/python-repl/index.js";
import { skillsTools } from "../tools/skills-tools.js";
import { stateTools } from "../tools/state-tools.js";
import { notepadTools } from "../tools/notepad-tools.js";
import { memoryTools } from "../tools/memory-tools.js";
// Aggregate all custom tools
const allTools = [
    ...lspTools,
    ...astTools,
    pythonReplTool,
    ...skillsTools,
    ...stateTools,
    ...notepadTools,
    ...memoryTools
];
// Convert to SDK tool format
// The SDK's tool() expects a ZodRawShape directly (not wrapped in z.object())
const sdkTools = allTools.map(t => tool(t.name, t.description, t.schema, async (args) => await t.handler(args)));
/**
 * In-process MCP server exposing all OMC custom tools
 *
 * Tools will be available as mcp__t__<tool_name>
 */
export const omcToolsServer = createSdkMcpServer({
    name: "t",
    version: "1.0.0",
    tools: sdkTools
});
/**
 * Tool names in MCP format for allowedTools configuration
 */
export const omcToolNames = allTools.map(t => `mcp__t__${t.name}`);
/**
 * Get tool names filtered by category
 */
export function getOmcToolNames(options) {
    const { includeLsp = true, includeAst = true, includePython = true, includeSkills = true, includeState = true, includeNotepad = true, includeMemory = true } = options || {};
    return omcToolNames.filter(name => {
        if (!includeLsp && name.includes('lsp_'))
            return false;
        if (!includeAst && name.includes('ast_'))
            return false;
        if (!includePython && name.includes('python_repl'))
            return false;
        if (!includeSkills && (name.includes('load_omc_skills') || name.includes('list_omc_skills')))
            return false;
        if (!includeState && name.includes('state_'))
            return false;
        if (!includeNotepad && name.includes('notepad_'))
            return false;
        if (!includeMemory && name.includes('memory_'))
            return false;
        return true;
    });
}
//# sourceMappingURL=omc-tools-server.js.map