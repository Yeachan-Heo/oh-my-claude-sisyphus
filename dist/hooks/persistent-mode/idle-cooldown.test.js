/**
 * Tests for per-session idle notification cooldown (issue #842).
 * Verifies that the TS hook path in bridge.ts uses the same cooldown logic
 * as scripts/persistent-mode.cjs.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { shouldSendIdleNotification, recordIdleNotificationSent, getIdleNotificationCooldownSeconds, } from "./index.js";
describe("idle notification cooldown (issue #842)", () => {
    let tempDir;
    let stateDir;
    beforeEach(() => {
        tempDir = mkdtempSync(join(tmpdir(), "idle-cooldown-test-"));
        stateDir = join(tempDir, ".omc", "state");
        mkdirSync(stateDir, { recursive: true });
    });
    afterEach(() => {
        rmSync(tempDir, { recursive: true, force: true });
    });
    describe("shouldSendIdleNotification", () => {
        it("returns true when no cooldown file exists", () => {
            expect(shouldSendIdleNotification(stateDir)).toBe(true);
        });
        it("returns false when cooldown file was written recently", () => {
            const cooldownPath = join(stateDir, "idle-notif-cooldown.json");
            writeFileSync(cooldownPath, JSON.stringify({ lastSentAt: new Date().toISOString() }));
            expect(shouldSendIdleNotification(stateDir)).toBe(false);
        });
        it("returns true when cooldown file timestamp is past the cooldown window", () => {
            const cooldownPath = join(stateDir, "idle-notif-cooldown.json");
            // Write a timestamp 2 minutes in the past (default cooldown is 60s)
            const past = new Date(Date.now() - 120_000).toISOString();
            writeFileSync(cooldownPath, JSON.stringify({ lastSentAt: past }));
            expect(shouldSendIdleNotification(stateDir)).toBe(true);
        });
        it("returns true when cooldown file contains invalid JSON", () => {
            const cooldownPath = join(stateDir, "idle-notif-cooldown.json");
            writeFileSync(cooldownPath, "{ not valid json");
            expect(shouldSendIdleNotification(stateDir)).toBe(true);
        });
        it("returns true when cooldown file is missing lastSentAt field", () => {
            const cooldownPath = join(stateDir, "idle-notif-cooldown.json");
            writeFileSync(cooldownPath, JSON.stringify({ other: "field" }));
            expect(shouldSendIdleNotification(stateDir)).toBe(true);
        });
    });
    describe("recordIdleNotificationSent", () => {
        it("creates cooldown file with lastSentAt timestamp", () => {
            const cooldownPath = join(stateDir, "idle-notif-cooldown.json");
            expect(existsSync(cooldownPath)).toBe(false);
            recordIdleNotificationSent(stateDir);
            expect(existsSync(cooldownPath)).toBe(true);
            const data = JSON.parse(readFileSync(cooldownPath, "utf-8"));
            expect(typeof data.lastSentAt).toBe("string");
            const ts = new Date(data.lastSentAt).getTime();
            expect(Number.isFinite(ts)).toBe(true);
            expect(ts).toBeGreaterThan(Date.now() - 5000);
        });
        it("overwrites an existing cooldown file", () => {
            const cooldownPath = join(stateDir, "idle-notif-cooldown.json");
            const old = new Date(Date.now() - 120_000).toISOString();
            writeFileSync(cooldownPath, JSON.stringify({ lastSentAt: old }));
            recordIdleNotificationSent(stateDir);
            const data = JSON.parse(readFileSync(cooldownPath, "utf-8"));
            expect(new Date(data.lastSentAt).getTime()).toBeGreaterThan(new Date(old).getTime());
        });
        it("creates intermediate directories if they do not exist", () => {
            const deepStateDir = join(tempDir, "new", "deep", ".omc", "state");
            expect(existsSync(deepStateDir)).toBe(false);
            recordIdleNotificationSent(deepStateDir);
            expect(existsSync(join(deepStateDir, "idle-notif-cooldown.json"))).toBe(true);
        });
    });
    describe("cooldown integration: send → suppress → send after expiry", () => {
        it("suppresses second notification within cooldown window", () => {
            // First call: no cooldown file → should send
            expect(shouldSendIdleNotification(stateDir)).toBe(true);
            recordIdleNotificationSent(stateDir);
            // Second call immediately after: within cooldown window → should NOT send
            expect(shouldSendIdleNotification(stateDir)).toBe(false);
        });
        it("allows notification again after cooldown expires", () => {
            // Simulate a cooldown file written 2 minutes ago (past default 60s window)
            const cooldownPath = join(stateDir, "idle-notif-cooldown.json");
            const past = new Date(Date.now() - 120_000).toISOString();
            writeFileSync(cooldownPath, JSON.stringify({ lastSentAt: past }));
            expect(shouldSendIdleNotification(stateDir)).toBe(true);
        });
    });
    describe("getIdleNotificationCooldownSeconds", () => {
        it("returns a non-negative number", () => {
            const val = getIdleNotificationCooldownSeconds();
            expect(typeof val).toBe("number");
            expect(val).toBeGreaterThanOrEqual(0);
        });
    });
});
//# sourceMappingURL=idle-cooldown.test.js.map