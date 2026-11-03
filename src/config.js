import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const CONFIG_DIR = path.join(os.homedir(), '.config', 'pocketops');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

const DEFAULT_CONFIG = {
  telegram_token: process.env.POCKETOPS_TELEGRAM_TOKEN || '',
  telegram_chat_id: process.env.POCKETOPS_TELEGRAM_CHAT_ID || '',
  webhook_url: process.env.POCKETOPS_WEBHOOK_URL || '',
  ntfy_topic: process.env.POCKETOPS_NTFY_TOPIC || '',
  disk_threshold: 85,
  memory_threshold: 90,
  port: 9090,
  hud_token: '',
};

export class ConfigManager {
  static load() {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
        return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
      }
    } catch (_) {}
    return { ...DEFAULT_CONFIG };
  }

  static save(config) {
    if (!fs.existsSync(CONFIG_DIR)) {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
    }
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
  }

  static get(key) {
    const conf = this.load();
    return conf[key];
  }

  static set(key, value) {
    const conf = this.load();
    conf[key] = value;
    this.save(conf);
    return conf;
  }
}
