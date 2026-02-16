/**
 * Notification Configuration Reader
 *
 * Reads notification config from .omc-config.json and provides
 * backward compatibility with the old stopHookCallbacks format.
 */
import type { NotificationConfig, NotificationEvent, NotificationPlatform } from "./types.js";
/**
 * Validate Discord mention format: <@USER_ID> or <@&ROLE_ID>.
 * Returns the mention string if valid, undefined otherwise.
 */
export declare function validateMention(raw: string | undefined): string | undefined;
/**
 * Parse a validated mention into allowed_mentions structure for Discord API.
 */
export declare function parseMentionAllowedMentions(mention: string | undefined): {
    users?: string[];
    roles?: string[];
};
/**
 * Build notification config from environment variables.
 * This enables zero-config notification setup - just set env vars in .zshrc.
 */
export declare function buildConfigFromEnv(): NotificationConfig | null;
/**
 * Get the notification configuration.
 *
 * When a profile name is provided (or set via OMC_NOTIFY_PROFILE env var),
 * the corresponding named profile from `notificationProfiles` is used.
 * Falls back to the default `notifications` config if the profile is not found.
 *
 * Reads from .omc-config.json, looking for the `notifications` key.
 * When file config exists, env-derived platforms are merged in to fill
 * missing platform blocks (file fields take precedence).
 * Falls back to migrating old `stopHookCallbacks` if present.
 * Returns null if no notification config is found.
 *
 * @param profileName - Optional profile name (overrides OMC_NOTIFY_PROFILE env var)
 */
export declare function getNotificationConfig(profileName?: string): NotificationConfig | null;
/**
 * Check if a specific event has any enabled platform.
 */
export declare function isEventEnabled(config: NotificationConfig, event: NotificationEvent): boolean;
/**
 * Get list of enabled platforms for an event.
 */
export declare function getEnabledPlatforms(config: NotificationConfig, event: NotificationEvent): NotificationPlatform[];
/**
 * Resolve bot credentials used by the reply listener daemon.
 * Supports both top-level and event-level platform configs.
 */
export declare function getReplyListenerPlatformConfig(config: NotificationConfig | null): {
    telegramBotToken?: string;
    telegramChatId?: string;
    discordBotToken?: string;
    discordChannelId?: string;
};
/**
 * Get reply injection configuration.
 *
 * Returns null when:
 * - Reply listening is disabled
 * - No reply-capable bot platform (discord-bot or telegram) is configured
 * - Notifications are globally disabled
 *
 * Reads from .omc-config.json notifications.reply section.
 * Environment variables override config file values:
 * - OMC_REPLY_ENABLED: enable reply listening (default: false)
 * - OMC_REPLY_POLL_INTERVAL_MS: polling interval in ms (default: 3000)
 * - OMC_REPLY_RATE_LIMIT: max messages per minute (default: 10)
 * - OMC_REPLY_DISCORD_USER_IDS: comma-separated authorized Discord user IDs
 * - OMC_REPLY_INCLUDE_PREFIX: include visual prefix (default: true)
 *
 * SECURITY: Logs warning when Discord bot is enabled but authorizedDiscordUserIds is empty.
 */
export declare function getReplyConfig(): import("./types.js").ReplyConfig | null;
//# sourceMappingURL=config.d.ts.map