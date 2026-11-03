import { ConfigManager } from './config.js';

export class Notifier {
  static async dispatch(title, message, options = {}) {
    const config = ConfigManager.load();
    const level = options.level || 'info'; // 'info', 'success', 'warning', 'critical'

    const levelIcon = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      critical: '🚨',
    }[level] || '📢';

    const formattedTitle = `${levelIcon} [${title.toUpperCase()}]`;
    const fullText = `*${formattedTitle}*\n${message}\n\n_Server: ${process.env.HOSTNAME || 'vps'}_`;

    const results = {
      telegram: false,
      ntfy: false,
      webhook: false,
    };

    // 1. Telegram
    if (config.telegram_token && config.telegram_chat_id) {
      try {
        const url = `https://api.telegram.org/bot${config.telegram_token}/sendMessage`;
        const body = {
          chat_id: config.telegram_chat_id,
          text: fullText,
          parse_mode: 'Markdown',
        };

        if (options.buttons) {
          body.reply_markup = { inline_keyboard: options.buttons };
        }

        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        results.telegram = res.ok;
      } catch (err) {
        results.telegramError = err.message;
      }
    }

    // 2. ntfy.sh (Zero-setup instant mobile push)
    if (config.ntfy_topic) {
      try {
        const priority = level === 'critical' ? 'urgent' : level === 'warning' ? 'high' : 'default';
        const res = await fetch(`https://ntfy.sh/${config.ntfy_topic}`, {
          method: 'POST',
          headers: {
            'Title': formattedTitle,
            'Priority': priority,
            'Tags': level === 'critical' ? 'rotating_light,fire' : level === 'success' ? 'tada' : 'bell',
          },
          body: message,
        });
        results.ntfy = res.ok;
      } catch (err) {
        results.ntfyError = err.message;
      }
    }

    // 3. Generic Webhook (Discord / Slack)
    if (config.webhook_url) {
      try {
        const res = await fetch(config.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: `${formattedTitle}\n${message}`,
            text: `${formattedTitle}\n${message}`,
          }),
        });
        results.webhook = res.ok;
      } catch (err) {
        results.webhookError = err.message;
      }
    }

    return results;
  }
}
