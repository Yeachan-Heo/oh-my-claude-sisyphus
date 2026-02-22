#!/usr/bin/env tsx

import { mkdtempSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { mkdirSync } from 'fs';

// Import the hooks
import { startUltraQA, clearUltraQAState, isRalphLoopActive } from '../src/hooks/ultraqa/index.js';
import { createRalphLoopHook, clearRalphState, isUltraQAActive } from '../src/hooks/ralph/index.js';

// Test utilities
function printTest(testName: string, passed: boolean) {
  const status = passed ? '\x1b[32m✓ PASS\x1b[0m' : '\x1b[31m✗ FAIL\x1b[0m';
  console.log(`${status} - ${testName}`);
}

async function runTests() {
  console.log('\n=== Testing Mutual Exclusion Between UltraQA and Ralph Loop ===\n');

  // Create temp directory with .omc subfolder
  const tempDir = mkdtempSync(join(tmpdir(), 'omc-test-'));
  const omcDir = join(tempDir, '.omc');
  mkdirSync(omcDir, { recursive: true });

  console.log(`Using temp directory: ${tempDir}\n`);

  let allTestsPassed = true;

  try {
    // Test 1: Start Ralph Loop, try to start UltraQA - should fail
    console.log('Test 1: Ralph Loop blocks UltraQA');
    console.log('  - Starting Ralph Loop...');

    const ralphHook = createRalphLoopHook(tempDir);
    const ralphStarted = ralphHook.startLoop(
      'test-session-1',
      'test task',
      { maxIterations: 5 }
    );

    if (!ralphStarted) {
      console.log('    Failed to start Ralph Loop');
      allTestsPassed = false;
    }

    console.log('  - Attempting to start UltraQA (should fail)...');
    const ultraQAResult1 = startUltraQA(
      tempDir,
      'all-tests-pass',
      'test-session-2'
    );

    if (ultraQAResult1.success) {
      printTest('Test 1: UltraQA should be blocked by Ralph Loop', false);
      allTestsPassed = false;
    } else if (ultraQAResult1.error?.includes('Ralph Loop is active')) {
      printTest('Test 1: UltraQA correctly blocked by Ralph Loop', true);
    } else {
      printTest('Test 1: UltraQA correctly blocked by Ralph Loop', false);
      console.log(`    Unexpected error: ${ultraQAResult1.error}`);
      allTestsPassed = false;
    }

    // Clear Ralph state
    console.log('  - Clearing Ralph state...\n');
    clearRalphState(tempDir);

    // Test 2: Start UltraQA, try to start Ralph Loop - should fail
    console.log('Test 2: UltraQA blocks Ralph Loop');
    console.log('  - Starting UltraQA...');

    const ultraQAResult2 = startUltraQA(
      tempDir,
      'all-tests-pass',
      'test-session-3'
    );

    if (!ultraQAResult2.success) {
      console.log(`    Failed to start UltraQA: ${ultraQAResult2.error}`);
      allTestsPassed = false;
    }

    console.log('  - Attempting to start Ralph Loop (should fail)...');
    const ralphHook2 = createRalphLoopHook(tempDir);
    const ralphStarted2 = ralphHook2.startLoop(
      'test-session-4',
      'test task',
      { maxIterations: 5 }
    );

    if (ralphStarted2) {
      printTest('Test 2: Ralph Loop should be blocked by UltraQA', false);
      allTestsPassed = false;
    } else {
      // Check if it was blocked due to UltraQA
      if (isUltraQAActive(tempDir)) {
        printTest('Test 2: Ralph Loop correctly blocked by UltraQA', true);
      } else {
        printTest('Test 2: Ralph Loop correctly blocked by UltraQA', false);
        console.log(`    Ralph Loop failed but UltraQA is not active`);
        allTestsPassed = false;
      }
    }

    // Clear UltraQA state
    console.log('  - Clearing UltraQA state...\n');
    clearUltraQAState(tempDir);

    // Test 3: Start UltraQA without any blockers - should succeed
    console.log('Test 3: UltraQA starts without blockers');
    console.log('  - Attempting to start UltraQA (should succeed)...');
    const ultraQAResult3 = startUltraQA(
      tempDir,
      'all-tests-pass',
      'test-session-5'
    );

    if (ultraQAResult3.success) {
      printTest('Test 3: UltraQA starts successfully without blockers', true);
    } else {
      printTest('Test 3: UltraQA should start without blockers', false);
      console.log(`    Unexpected error: ${ultraQAResult3.error}`);
      allTestsPassed = false;
    }

    // Final cleanup
    console.log('  - Clearing UltraQA state...\n');
    clearUltraQAState(tempDir);

  } finally {
    // Clean up temp directory
    console.log(`Cleaning up temp directory: ${tempDir}`);
    rmSync(tempDir, { recursive: true, force: true });
  }

  // Summary
  console.log('\n=== Test Summary ===');
  if (allTestsPassed) {
    console.log('\x1b[32m✓ All tests passed!\x1b[0m\n');
    process.exit(0);
  } else {
    console.log('\x1b[31m✗ Some tests failed\x1b[0m\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\x1b[31mTest execution failed:\x1b[0m', error);
  process.exit(1);
});
