import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ConfigManager } from './config.js';
import { getSystemSummary, cleanSafeCaches, getDiskMetrics } from './system.js';
import { TelegramBot } from './telegram.js';
import { Notifier } from './notifier.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class PocketOpsDaemon {
  constructor(options = {}) {
    this.config = ConfigManager.load();
    this.port = options.port || this.config.port || 9090;
    this.host = options.host || '0.0.0.0';
    this.bot = new TelegramBot();
    this.server = null;
    this.watchdogTimer = null;
    this.lastDiskAlertTime = 0;
  }

  start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => this.handleHttp(req, res));
      this.server.on('error', reject);
      this.server.listen(this.port, this.host, () => {
        // Start Telegram Bot
        this.bot.start();

        // Start Watchdog Sentinel Loop (every 60s)
        this.startWatchdog();

        resolve({ port: this.port, host: this.host });
      });
    });
  }

  stop() {
    return new Promise(resolve => {
      if (this.watchdogTimer) clearInterval(this.watchdogTimer);
      this.bot.stop();
      if (this.server) {
        this.server.close(resolve);
      } else {
        resolve();
      }
    });
  }

  startWatchdog() {
    this.watchdogTimer = setInterval(async () => {
      try {
        const disk = await getDiskMetrics('/');
        const now = Date.now();
        const threshold = this.config.disk_threshold || 85;

        // Check disk space threshold with 30-min cooldown
        if (disk.usedPercent >= threshold && (now - this.lastDiskAlertTime > 30 * 60 * 1000)) {
          this.lastDiskAlertTime = now;
          const level = disk.usedPercent >= 90 ? 'critical' : 'warning';
          await Notifier.dispatch(
            `Disk Sentinel Alert (${disk.usedPercent}%)`,
            `⚠️ Partition \`${disk.mount}\` is at *${disk.usedPercent}%* capacity!\nAvailable: *${disk.availGb} GB* / Total: *${disk.totalGb} GB*`,
            { level }
          );
        }
      } catch (_) {}
    }, 60_000);
  }

  async handleHttp(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = parsedUrl.pathname;

    // 1. Web HUD
    if (pathname === '/' || pathname === '/hud') {
      const htmlPath = path.join(__dirname, 'web', 'hud.html');
      fs.readFile(htmlPath, 'utf8', (err, content) => {
        if (err) {
          res.writeHead(500, { 'Content-Type': 'text/plain' });
          res.end('Error loading HUD');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    // 2. Metrics API
    if (pathname === '/api/metrics' && req.method === 'GET') {
      const summary = await getSystemSummary();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(summary));
      return;
    }

    // 3. Clean Caches API
    if (pathname === '/api/clean' && req.method === 'POST') {
      const result = await cleanSafeCaches();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(result));
      return;
    }

    // 4. Send Manual Alert API
    if (pathname === '/api/alert' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', async () => {
        try {
          const parsed = JSON.parse(body || '{}');
          const title = parsed.title || 'Manual Alert';
          const message = parsed.message || 'Ping';
          const level = parsed.level || 'info';
          const dis = await Notifier.dispatch(title, message, { level });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(dis));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: err.message }));
        }
      });
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
  }
}
