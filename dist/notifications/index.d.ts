/**
 * Notification System - Public API
 *
 * Multi-platform lifecycle notifications for oh-my-claudecode.
 * Sends notifications to Discord, Telegram, Slack, and generic webhooks
 * on session lifecycle events.
 *
 * Usage:
 *   import { notify } from '../notifications/index.js';
 *   await notify('session-start', { sessionId, projectPath, ... });
 */
export type { NotificationEvent, NotificationPlatform, NotificationConfig, NotificationProfilesConfig, NotificationPayload, NotificationResult, DispatchResult, DiscordNotificationConfig, DiscordBotNotificationConfig, TelegramNotificationConfig, SlackNotificationConfig, WebhookNotificationConfig, EventNotificationConfig, } from "./types.js";
export { dispatchNotifications, sendDiscord, sendDiscordBot, sendTelegram, sendSlack, sendWebhook, } from "./dispatcher.js";
export { formatNotification, formatSessionStart, formatSessionStop, formatSessionEnd, formatSessionIdle, formatAskUserQuestion, formatAgentCall, } from "./formatter.js";
export { getCurrentTmuxSession, getCurrentTmuxPaneId, getTeamTmuxSessions, formatTmuxInfo, } from "./tmux.js";
export { getNotificationConfig, isEventEnabled, getEnabledPlatforms, getVerbosity, isEventAllowedByVerbosity, shouldIncludeTmuxTail, } from "./config.js";
import type { NotificationEvent, NotificationPayload, DispatchResult } from "./types.js";
/**
 * High-level notification function.
 *
 * Reads config, checks if the event is enabled, formats the message,
 * and dispatches to all configured platforms. Non-blocking, swallows errors.
 *
 * @param event - The notification event type
 * @param data - Partial payload data (message will be auto-formatted if not provided)
 * @returns DispatchResult or null if notifications are not configured/enabled
 */
export declare function notify(event: NotificationEvent, data: Partial<NotificationPayload> & {
    sessionId: string;
    profileName?: string;
}): Promise<DispatchResult | null>;
//# sourceMappingURL=index.d.ts.map