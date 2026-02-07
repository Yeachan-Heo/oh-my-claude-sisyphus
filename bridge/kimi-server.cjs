
// Resolve global npm modules
try {
  var _cp = require('child_process');
  var _Module = require('module');
  var _globalRoot = _cp.execSync('npm root -g', { encoding: 'utf8', timeout: 5000 }).trim();
  if (_globalRoot) {
    process.env.NODE_PATH = _globalRoot + (process.env.NODE_PATH ? ':' + process.env.NODE_PATH : '');
    _Module._initPaths();
  }
} catch (_e) { /* ignore */ }

"use strict";

// src/mcp/kimi-core.ts
var import_child_process = require("child_process");
var import_fs = require("fs");
var import_path = require("path");
var KIMI_DEFAULT_MODEL = process.env.OMC_KIMI_DEFAULT_MODEL || "moonshot-v1-8k";
var KIMI_TIMEOUT = parseInt(process.env.OMC_KIMI_TIMEOUT || "300000", 10);
var kimiCliPath = null;
var detectionAttempted = false;
function detectKimiCli() {
  if (detectionAttempted) {
    return kimiCliPath;
  }
  detectionAttempted = true;
  try {
    const uvHome = process.env.UV_HOME || (process.env.HOME ? (0, import_path.join)(process.env.HOME, ".uv") : null);
    if (uvHome && (0, import_fs.existsSync)((0, import_path.join)(uvHome, "bin", "kimi"))) {
      kimiCliPath = (0, import_path.join)(uvHome, "bin", "kimi");
      console.log(`[kimi-core] Found Kimi-CLI at: ${kimiCliPath}`);
      return kimiCliPath;
    }
    const result = (0, import_child_process.execSync)("which kimi 2>/dev/null", {
      encoding: "utf-8",
      timeout: 5e3
    }).trim();
    if (result) {
      kimiCliPath = result.split("\\n")[0].trim();
      console.log(`[kimi-core] Found Kimi-CLI in PATH at: ${kimiCliPath}`);
      return kimiCliPath;
    }
  } catch {
  }
  console.log("[kimi-core] Kimi-CLI not found. Install with: curl -LsSf https://code.kimi.com/install.sh | bash");
  return null;
}
async function runKimiPrompt(options) {
  const cli = detectKimiCli();
  if (!cli) {
    return {
      success: false,
      error: "Kimi-CLI not found. Install with: curl -LsSf https://code.kimi.com/install.sh | bash"
    };
  }
  const model = options.model || KIMI_DEFAULT_MODEL;
  const cwd = options.workingDirectory || process.cwd();
  return new Promise((resolve) => {
    const child = (0, import_child_process.spawn)(cli, ["--model", model], {
      cwd,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: KIMI_TIMEOUT
    });
    let stdout = "";
    let stderr = "";
    let fullPrompt = options.prompt;
    if (options.files && options.files.length > 0) {
      const fileContents = options.files.map((f) => `--- ${f} ---\\n${(0, import_fs.readFileSync)((0, import_path.join)(cwd, f), "utf-8")}`).join("\\n\\n");
      fullPrompt = `Context files:\\n${fileContents}\\n\\n---\\n\\nTask: ${options.prompt}`;
    }
    child.stdin.write(fullPrompt + "\\n");
    child.stdin.end();
    child.stdout?.on("data", (data) => {
      stdout += data.toString();
    });
    child.stderr?.on("data", (data) => {
      stderr += data.toString();
    });
    child.on("close", (code) => {
      const response = stdout.split("Kimi:").pop()?.trim() || stdout.trim();
      if (code === 0 || response) {
        resolve({
          success: true,
          result: response
        });
      } else {
        resolve({
          success: false,
          error: stderr || `Process exited with code ${code}`
        });
      }
    });
    child.on("error", (err) => {
      resolve({
        success: false,
        error: err.message
      });
    });
  });
}

// src/mcp/kimi-standalone-server.ts
var buffer = "";
process.stdin.on("data", (chunk) => {
  buffer += chunk.toString();
  let boundary = buffer.indexOf("\\n");
  while (boundary !== -1) {
    const message = buffer.substring(0, boundary);
    buffer = buffer.substring(boundary + 1);
    if (message) {
      handleMessage(message);
    }
    boundary = buffer.indexOf("\\n");
  }
});
async function handleMessage(message) {
  try {
    const { id, command, payload } = JSON.parse(message);
    let result;
    switch (command) {
      case "detect":
        result = detectKimiCli();
        break;
      case "run":
        result = await runKimiPrompt(payload);
        break;
      default:
        result = { success: false, error: `Unknown command: ${command}` };
    }
    sendResponse(id, result);
  } catch (error) {
    sendResponse(
      null,
      { success: false, error: `Failed to process message: ${error.message}` }
    );
  }
}
function sendResponse(id, payload) {
  try {
    const response = JSON.stringify({ id, payload });
    process.stdout.write(response + "\\n");
  } catch (error) {
    const errorResponse = JSON.stringify({
      id,
      payload: { success: false, error: `Failed to serialize response: ${error.message}` }
    });
    process.stdout.write(errorResponse + "\\n");
  }
}
sendResponse("ready", { status: "ready" });
