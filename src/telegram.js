import { ConfigManager } from './config.js';
import { getSystemSummary, cleanSafeCaches, getDiskMetrics } from './system.js';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export class TelegramBot {
  constructor() {
    this.config = ConfigManager.load();
    this.offset = 0;
    this.running = false;
  }

  start() {
    if (!this.config.telegram_token) {
      console.log('\x1b[33m[Telegram] Bot token not configured. Telegram listener disabled.\x1b[0m');
      return;
    }
    this.running = true;
    console.log('\x1b[32m[Telegram] Bot long-polling started for admin chat ID: ' + (this.config.telegram_chat_id || 'ANY (First user will pair)') + '\x1b[0m');
    this.poll();
  }

  stop() {
    this.running = false;
  }

  async poll() {
    while (this.running) {
      try {
        const url = `https://api.telegram.org/bot${this.config.telegram_token}/getUpdates?offset=${this.offset}&timeout=20`;
        const res = await fetch(url);
        if (!res.ok) {
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }

        const data = await res.json();
        if (data.ok && data.result) {
          for (const update of data.result) {
            this.offset = update.update_id + 1;
            await this.handleUpdate(update);
          }
        }
      } catch (err) {
        await new Promise(r => setTimeout(r, 4000));
      }
    }
  }

  async handleUpdate(update) {
    const msg = update.message;
    if (!msg || !msg.text) return;

    const chatId = msg.chat.id.toString();

    // Auto-pairing: if telegram_chat_id is empty, first user to send /start pairs as admin!
    if (!this.config.telegram_chat_id) {
      this.config.telegram_chat_id = chatId;
      ConfigManager.set('telegram_chat_id', chatId);
      await this.sendMessage(chatId, `🎉 *Paired Successfully!*\nYou are now registered as the PocketOps administrator for server \`${process.env.HOSTNAME || 'vps'}\`.`);
    } else if (this.config.telegram_chat_id !== chatId) {
      await this.sendMessage(chatId, '⛔ *Unauthorized Access Denied.*');
      return;
    }

    const text = msg.text.trim();

    if (text === '/start' || text === '/help') {
      const welcome = [
        `🤖 *PocketOps Sentinel — Server Controller*`,
        `Host: \`${process.env.HOSTNAME || 'vps'}\``,
        ``,
        `Choose an operation below:`,
      ].join('\n');

      const keyboard = [
        [{ text: '📊 Status' }, { text: '💾 Disk' }],
        [{ text: '⚡ Top RAM' }, { text: '🐳 Docker' }],
        [{ text: '🧹 Clean Caches' }, { text: '🔄 Uptime' }],
      ];

      await this.sendMessage(chatId, welcome, { keyboard });
      return;
    }

    if (text === '📊 Status' || text === '/status') {
      const summary = await getSystemSummary();
      const diskBar = makeProgressBar(summary.disk.usedPercent);
      const memBar = makeProgressBar(summary.memory.usedPercent);

      const resp = [
        `📊 *SERVER STATUS: \`${summary.hostname}\`*`,
        `⏱ Uptime: *${summary.uptime}*`,
        ``,
        `💾 *Disk (/):* ${summary.disk.usedGb} / ${summary.disk.totalGb} GB (${summary.disk.usedPercent}%)`,
        `\`${diskBar}\``,
        ``,
        `🧠 *RAM:* ${summary.memory.usedMb} / ${summary.memory.totalMb} MB (${summary.memory.usedPercent}%)`,
        `\`${memBar}\``,
        ``,
        `🔥 *Load Avg:* 1m: \`${summary.cpu.load1}\` | 5m: \`${summary.cpu.load5}\``,
      ].join('\n');

      await this.sendMessage(chatId, resp);
      return;
    }

    if (text === '💾 Disk' || text === '/disk') {
      const disk = await getDiskMetrics('/');
      const bar = makeProgressBar(disk.usedPercent);
      const msg = [
        `💾 *DISK METRICS:*`,
        `Mount: \`${disk.mount}\``,
        `Total: *${disk.totalGb} GB*`,
        `Used:  *${disk.usedGb} GB* (${disk.usedPercent}%)`,
        `Free:  *${disk.availGb} GB*`,
        `\`${bar}\``,
        disk.isWarning ? `\n⚠️ *Warning:* Disk usage exceeds threshold!` : `\n✅ Storage health is normal.`,
      ].join('\n');
      await this.sendMessage(chatId, msg);
      return;
    }

    if (text === '⚡ Top RAM' || text === '/top') {
      const summary = await getSystemSummary();
      let msg = `⚡ *TOP PROCESSES (BY RAM):*\n\n`;
      for (const p of summary.topProcesses) {
        msg += `• \`${p.pid}\` *${p.mem}%* RAM (${p.cpu}% CPU) — \`${p.cmd}\`\n`;
      }
      await this.sendMessage(chatId, msg);
      return;
    }

    if (text === '🐳 Docker' || text === '/docker') {
      const summary = await getSystemSummary();
      if (!summary.docker || summary.docker.length === 0) {
        await this.sendMessage(chatId, `🐳 No active Docker containers found.`);
        return;
      }
      let msg = `🐳 *DOCKER CONTAINERS:*\n\n`;
      for (const c of summary.docker) {
        const icon = c.running ? '🟢' : '🔴';
        msg += `${icon} *${c.name}*\nStatus: \`${c.status}\`\nImage: \`${c.image}\`\n\n`;
      }
      await this.sendMessage(chatId, msg);
      return;
    }

    if (text === '🧹 Clean Caches' || text === '/clean') {
      await this.sendMessage(chatId, `🧹 *Running safe disk cleanup...*`);
      const res = await cleanSafeCaches();
      const diskAfter = await getDiskMetrics('/');
      const msg = [
        `✅ *CLEANUP COMPLETE:*`,
        res.cleaned.length > 0 ? res.cleaned.map(c => `• ${c}`).join('\n') : `• Nothing to clean`,
        ``,
        `💾 Free Disk Now: *${diskAfter.availGb} GB* (${diskAfter.usedPercent}% used)`,
      ].join('\n');
      await this.sendMessage(chatId, msg);
      return;
    }

    if (text.startsWith('/exec ')) {
      const cmd = text.replace('/exec ', '');
      try {
        const { stdout, stderr } = await execAsync(cmd, { timeout: 15000 });
        const out = (stdout || stderr || 'Empty output').slice(0, 3000);
        await this.sendMessage(chatId, `💻 *Command Executed:*\n\`\`\`\n${out}\n\`\`\``);
      } catch (err) {
        await this.sendMessage(chatId, `❌ *Execution Failed:*\n\`\`\`\n${err.message.slice(0, 1000)}\n\`\`\``);
      }
      return;
    }
  }

  async sendMessage(chatId, text, options = {}) {
    const url = `https://api.telegram.org/bot${this.config.telegram_token}/sendMessage`;
    const payload = {
      chat_id: chatId,
      text,
      parse_mode: 'Markdown',
    };

    if (options.keyboard) {
      payload.reply_markup = {
        keyboard: options.keyboard,
        resize_keyboard: true,
      };
    }

    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (_) {}
  }
}

function makeProgressBar(percent, length = 10) {
  const filled = Math.min(Math.max(Math.round((percent / 100) * length), 0), length);
  const empty = length - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
}
