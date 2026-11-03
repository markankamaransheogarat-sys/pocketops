# 📱 POCKETOPS: Linux Server Sentinel & Mobile Telegram HUD

[![License: MIT](https://img.shields.io/badge/License-MIT-00ff66.svg?style=flat-square)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0%20(Pure%20Node%20Stdlib)-00e5ff.svg?style=flat-square)](#)
[![Alert Channels](https://img.shields.io/badge/Alerts-Telegram%20%7C%20ntfy.sh%20%7C%20Webhooks-ff0055.svg?style=flat-square)](#)
[![Disk Sentinel](https://img.shields.io/badge/Watchdog-Disk%20%2B%20RAM%20%2B%20Docker-ffcc00.svg?style=flat-square)](#)
[![Tests](https://img.shields.io/badge/Tests-8%2F8%20Passing-00ff66.svg?style=flat-square)](#)

```
  ██████   ▒█████   ▄████▄   ██ ▄█▀▓█████▄▄▄█████▓ ▒█████   ██▓███    ██████ 
▒██░  ██▒▒██▒  ██▒▒██▀ ▀█   ██▄█▒ ▓█   ▀▓  ██▒ ▓▒▒██▒  ██▒▓██░  ██▒▒██    ▒ 
▒██░ ██▓▒▒██░  ██▒▒▓█    ▄ ▓███▄░ ▒███  ▒ ▓██░ ▒░▒██░  ██▒▓██░ ██▓▒░ ▓██▄   
░██▄█▓▒ ▒▒██   ██░▒▓▓▄ ▄██▒▓██ █▄ ▒▓█  ▄░ ▓██▓ ░ ▒██   ██░▒██▄█▓▒ ▒  ▒   ██▒
▒██▒ ░  ░░ ████▓▒░▒ ▓███▀ ░▒██▒ █▄░▒████▒  ▒██▒ ░ ░ ████▓▒░▒██▒ ░  ░▒██████▒▒
▒▓▒░ ░  ░░ ▒░▒░▒░ ░ ░▒ ▒  ░▒ ▒▒ ▓▒░░ ▒░ ░  ▒ ░░   ░ ▒░▒░▒░ ▒▓▒░ ░  ░▒ ▒▓▒ ▒ ░
░▒ ░       ░ ▒ ▒░   ░  ▒   ░ ░▒ ▒░ ░ ░  ░    ░      ░ ▒ ▒░ ░▒ ░     ░ ░▒  ░ ░
░░       ░ ░ ░ ▒  ░        ░ ░░ ░    ░      ░      ░ ░ ░ ▒  ░░       ░  ░  ░  
             ░ ░  ░ ░      ░  ░      ░  ░              ░ ░                 ░  
                  ░                                                           
```

> **Your server in your pocket.**  
> PocketOps is a zero-dependency Linux sentinel daemon, CLI command monitor, and interactive mobile controller connecting your phone via **Telegram Bot, ntfy.sh instant push, and a dark-mode Web HUD**.

---

## 💡 Why PocketOps?

1. **Long-Running Process Alerts**:
   Start a build, model training, or database migration and walk away from your desk. PocketOps tracks the execution time and immediately pings your phone with exit codes and error logs:
   ```bash
   pocketops run -- "cargo build --release"
   pocketops run --tag "LLM Fine-tuning" -- "python3 train.py"
   ```
2. **Disk Exhaustion Sentinel (Watchdog)**:
   Never wake up to a crashed server caused by `No space left on device`. PocketOps continuously monitors partition thresholds (e.g. 85%) and fires urgent alerts with top memory and disk consumers.
3. **Interactive Telegram Mobile Remote**:
   Control your VPS right from your Telegram chat with quick buttons:
   - `[📊 Status]` — Live CPU, RAM, Disk, Load averages.
   - `[💾 Disk]` — Partition breakdown and warning checks.
   - `[⚡ Top RAM]` — Top 5 memory-hungry processes.
   - `[🐳 Docker]` — Container health statuses.
   - `[🧹 Clean Caches]` — 1-tap safe purge of stale caches.
4. **Zero-Setup Push Notifications (ntfy.sh)**:
   Don't have a Telegram bot yet? Set a custom topic and get instant native push notifications on your iPhone or Android without creating any accounts.
5. **Standalone Cyberpunk Web HUD**:
   Runs an embedded, responsive mobile web dashboard on your LAN/VPN (port 9090).

---

## ⚡ Quickstart & Telemetry

### 1. Check Server Metrics Instantly
```bash
pocketops status
```

Output:
```
========================================================================
 📱 POCKETOPS SYSTEM TELEMETRY // SPICY-BLUSH.PTR.NETWORK 
========================================================================
  ⏱ Uptime:       262h 13m
  🔥 CPU Load:     1m: 0.77 | 5m: 0.41 | 15m: 0.27 (2 cores)
  🧠 RAM:          2011 / 3911 MB (51%)
  💾 Disk (/):     32.94 / 58.94 GB (59%) [22.99 GB free]

Top RAM Consuming Processes:
  PID      RAM%   CPU%   COMMAND
  1488063  13.5%  0.6%   agy --remote-control --dang
  141176   6.6%   2.1%   /bin/warp-svc
  2300874  5.2%   0.3%   /var/www/the-subtext/venv/b
  958468   3.6%   1.7%   /usr/bin/node dist/index.js

Docker Containers:
  ● vasyord              Up 9 days
```

---

## 📲 Setting Up Push Notifications

### Option A: Free Instant Push via ntfy.sh (No Bot Required!)
1. Install the free **ntfy** app on your iPhone (App Store) or Android (Google Play / F-Droid).
2. Subscribe to any private topic name in the app (e.g. `my-vps-alerts-777`).
3. Configure PocketOps:
   ```bash
   pocketops config ntfy_topic "my-vps-alerts-777"
   ```
4. Test it:
   ```bash
   pocketops notify "Hello from Linux terminal!"
   ```

### Option B: Interactive Telegram Bot
1. Message `@BotFather` on Telegram to create a bot and get a token.
2. Configure PocketOps:
   ```bash
   pocketops config telegram_token "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
   ```
3. Start the daemon:
   ```bash
   pocketops daemon
   ```
4. Open your bot in Telegram and send `/start`. PocketOps will auto-pair with your Telegram account as administrator and show the interactive command keyboard!

---

## 💻 Daily Workflow & CLI Commands

### Track Long Build or Training Commands
```bash
# Notifies your phone when finished or if it fails
pocketops run -- "npm run build"
pocketops run --tag "Docker Build" -- "docker build -t myapp ."
```

### Safely Purge Stale Caches
Safely cleans pip cache, npm cache, and stale `/tmp` files:
```bash
pocketops clean
```

### Start Sentinel Daemon & Mobile Web HUD
```bash
pocketops daemon --port 9090
```
Open `http://<your-server-ip>:9090` in your phone browser to view the live dashboard.

---

## 🧪 Automated Tests

```bash
npm test
```

Output:
```
✔ ConfigManager loads and updates keys (2.7ms)
✔ PocketOpsDaemon starts HTTP server and responds with metrics (181ms)
✔ runMonitoredCommand executes and returns execution metrics (12.7ms)
✔ getDiskMetrics parses root filesystem correctly (12.5ms)
✔ getMemoryMetrics retrieves host RAM correctly (0.4ms)
✔ getCpuMetrics returns load averages and cores (0.4ms)
✔ getTopProcesses returns active process list (21ms)
✔ getSystemSummary combines all metrics (72ms)

ℹ tests 8 | pass 8 | fail 0 | duration_ms 1011
```

---

## 📜 License

Created and maintained by **Konstantin ([@markankamaransheogarat-sys](https://github.com/markankamaransheogarat-sys))**.  
Licensed under the [MIT License](LICENSE).
