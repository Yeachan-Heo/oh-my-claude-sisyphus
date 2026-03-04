/**
 * Unit tests for isAuthenticationError detection function.
 * Fix for: https://github.com/Yeachan-Heo/oh-my-claudecode/issues/1308
 */
import { describe, it, expect } from "vitest";
import { isAuthenticationError } from "../index.js";
describe("isAuthenticationError", () => {
    it("should return false for undefined context", () => {
        expect(isAuthenticationError(undefined)).toBe(false);
    });
    it("should return false for empty context", () => {
        expect(isAuthenticationError({})).toBe(false);
    });
    // Exact stop_reason patterns
    it("should detect authentication_error", () => {
        expect(isAuthenticationError({ stop_reason: "authentication_error" })).toBe(true);
    });
    it("should detect authentication_failed", () => {
        expect(isAuthenticationError({ stop_reason: "authentication_failed" })).toBe(true);
    });
    it("should detect unauthorized", () => {
        expect(isAuthenticationError({ stop_reason: "unauthorized" })).toBe(true);
    });
    it("should detect 401", () => {
        expect(isAuthenticationError({ stop_reason: "401" })).toBe(true);
    });
    it("should detect invalid_api_key", () => {
        expect(isAuthenticationError({ stop_reason: "invalid_api_key" })).toBe(true);
    });
    it("should detect api_key_expired", () => {
        expect(isAuthenticationError({ stop_reason: "api_key_expired" })).toBe(true);
    });
    it("should detect token_expired", () => {
        expect(isAuthenticationError({ stop_reason: "token_expired" })).toBe(true);
    });
    it("should detect oauth_error", () => {
        expect(isAuthenticationError({ stop_reason: "oauth_error" })).toBe(true);
    });
    it("should detect oauth_expired", () => {
        expect(isAuthenticationError({ stop_reason: "oauth_expired" })).toBe(true);
    });
    it("should detect permission_denied", () => {
        expect(isAuthenticationError({ stop_reason: "permission_denied" })).toBe(true);
    });
    it("should detect forbidden", () => {
        expect(isAuthenticationError({ stop_reason: "forbidden" })).toBe(true);
    });
    it("should detect 403", () => {
        expect(isAuthenticationError({ stop_reason: "403" })).toBe(true);
    });
    it("should detect credentials_expired", () => {
        expect(isAuthenticationError({ stop_reason: "credentials_expired" })).toBe(true);
    });
    // Compound patterns (substring matches)
    it("should detect compound authentication_error patterns", () => {
        expect(isAuthenticationError({ stop_reason: "api_authentication_error" })).toBe(true);
    });
    // Case insensitivity
    it("should be case insensitive", () => {
        expect(isAuthenticationError({ stop_reason: "AUTHENTICATION_ERROR" })).toBe(true);
        expect(isAuthenticationError({ stop_reason: "Authentication_Failed" })).toBe(true);
        expect(isAuthenticationError({ stop_reason: "Unauthorized" })).toBe(true);
        expect(isAuthenticationError({ stop_reason: "TOKEN_EXPIRED" })).toBe(true);
    });
    // camelCase stopReason field
    it("should support stopReason camelCase field", () => {
        expect(isAuthenticationError({ stopReason: "authentication_error" })).toBe(true);
        expect(isAuthenticationError({ stopReason: "token_expired" })).toBe(true);
    });
    // endTurnReason field
    it("should detect auth errors in end_turn_reason field", () => {
        expect(isAuthenticationError({ end_turn_reason: "authentication_error" })).toBe(true);
        expect(isAuthenticationError({ end_turn_reason: "unauthorized" })).toBe(true);
    });
    it("should detect auth errors in endTurnReason camelCase field", () => {
        expect(isAuthenticationError({ endTurnReason: "401" })).toBe(true);
        expect(isAuthenticationError({ endTurnReason: "token_expired" })).toBe(true);
    });
    // Negative cases - should NOT match
    it("should not match rate limit errors", () => {
        expect(isAuthenticationError({ stop_reason: "rate_limit" })).toBe(false);
    });
    it("should not match context limit", () => {
        expect(isAuthenticationError({ stop_reason: "context_limit" })).toBe(false);
    });
    it("should not match user cancel", () => {
        expect(isAuthenticationError({ stop_reason: "user_cancel" })).toBe(false);
    });
    it("should not match end_turn", () => {
        expect(isAuthenticationError({ stop_reason: "end_turn" })).toBe(false);
    });
    it("should not match empty stop_reason", () => {
        expect(isAuthenticationError({ stop_reason: "" })).toBe(false);
    });
    it("should handle null stop_reason gracefully", () => {
        const context = { stop_reason: null };
        expect(isAuthenticationError(context)).toBe(false);
    });
    // Both fields present — stop_reason takes priority via ?? (nullish coalescing)
    it("should use stop_reason over stopReason when both present", () => {
        // stop_reason is 'authentication_error' → match
        expect(isAuthenticationError({
            stop_reason: "authentication_error",
            stopReason: "unrelated",
        })).toBe(true);
        // stop_reason is 'unrelated' (takes priority) → no match
        expect(isAuthenticationError({
            stop_reason: "unrelated",
            stopReason: "authentication_error",
        })).toBe(false);
    });
    it("should fall back to stopReason when stop_reason is undefined", () => {
        expect(isAuthenticationError({
            stopReason: "authentication_error",
        })).toBe(true);
    });
});
//# sourceMappingURL=isAuthenticationError.test.js.map