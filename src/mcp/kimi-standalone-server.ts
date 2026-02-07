
/**
 * Kimi MCP Standalone Server
 *
 * Bundled into a CJS file for external process communication.
 */

import {
  detectKimiCli,
  runKimiPrompt,
} from './kimi-core.js';

let buffer = '';

process.stdin.on('data', (chunk) => {
  buffer += chunk.toString();
  let boundary = buffer.indexOf('\\n');
  while (boundary !== -1) {
    const message = buffer.substring(0, boundary);
    buffer = buffer.substring(boundary + 1);
    if (message) {
      handleMessage(message);
    }
    boundary = buffer.indexOf('\\n');
  }
});

async function handleMessage(message: string) {
  try {
    const { id, command, payload } = JSON.parse(message);
    let result;

    switch (command) {
      case 'detect':
        result = detectKimiCli();
        break;
      case 'run':
        result = await runKimiPrompt(payload);
        break;
      default:
        result = { success: false, error: `Unknown command: ${command}` };
    }

    sendResponse(id, result);
  } catch (error: any) {
    sendResponse(
      null,
      { success: false, error: `Failed to process message: ${error.message}` }
    );
  }
}

function sendResponse(id: string | null, payload: any) {
  try {
    const response = JSON.stringify({ id, payload });
    process.stdout.write(response + '\\n');
  } catch (error: any) {
    const errorResponse = JSON.stringify({
      id,
      payload: { success: false, error: `Failed to serialize response: ${error.message}` }
    });
    process.stdout.write(errorResponse + '\\n');
  }
}

// Notify parent that the server is ready
sendResponse('ready', { status: 'ready' });
