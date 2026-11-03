#!/usr/bin/env node

import { getSystemSummary, cleanSafeCaches, getDiskMetrics } from '../src/system.js';
import { ConfigManager } from '../src/config.js';
import { Notifier } from '../src/notifier.js';
import { runMonitoredCommand } from '../src/runner.js';
import { PocketOpsDaemon } from '../src/daemon.js';

function printHelp() {
  console.log(`
\x1b[1;36m📱 POCKETOPS — Zero-Dependency Linux Sentinel & Mobile Telegram HUD\x1b[0m

\x1b[1mUSAGE:\x1b[0m
  pocketops <command> [arguments]

\x1b[1mCOMMANDS:\x1b[0m
  \x1b[33mstatus\x1b[0m                    Show live CPU, RAM, Disk, and Top Processes
  \x1b[33mnotify\x1b[0m <message>          Send push notification to Telegram / ntfy / Webhook
  \x1b[33malert\x1b[0m <message>           Send high-priority warning/critical alert
  \x1b[33mrun\x1b[0m [--tag name] -- <cmd> Execute command, monitor runtime & alert on finish
  \x1b[33mclean\x1b[0m                     Safely purge temporary npm, pip, and stale caches
  \x1b[33mdaemon\x1b[0m [--port 9090]      Start Sentinel background monitor & Mobile Web HUD
  \x1b[33mconfig\x1b[0m [key] [value]       View or update configuration settings
  \x1b[33mhelp\x1b[0m                      Display this help screen

\x1b[1mEXAMPLES:\x1b[0m
  # Alert your phone when a build or train script finishes:
  $ pocketops run -- "cargo build --release"
  $ pocketops run --tag "ML Train" -- "python3 train.py"

  # Quick manual notification:
  $ pocketops notify "Database backup completed successfully!"

  # Configure Telegram Bot:
  $ pocketops config telegram_token "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
  $ pocketops config ntfy_topic "my-secret-server-alerts"

  # Clean disk:
  $ pocketops clean
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';

  switch (command) {
    case 'status': {
      const summary = await getSystemSummary();
      console.log(`\x1b[1;36m========================================================================\x1b[0m`);
      console.log(`\x1b[1;32m 📱 POCKETOPS SYSTEM TELEMETRY // ${summary.hostname.toUpperCase()} \x1b[0m`);
      console.log(`\x1b[1;36m========================================================================\x1b[0m`);
      console.log(`  ⏱ Uptime:       ${summary.uptime}`);
      console.log(`  🔥 CPU Load:     1m: ${summary.cpu.load1} | 5m: ${summary.cpu.load5} | 15m: ${summary.cpu.load15} (${summary.cpu.cores} cores)`);
      console.log(`  🧠 RAM:          ${summary.memory.usedMb} / ${summary.memory.totalMb} MB (${summary.memory.usedPercent}%)`);
      console.log(`  💾 Disk (/):     ${summary.disk.usedGb} / ${summary.disk.totalGb} GB (${summary.disk.usedPercent}%) [${summary.disk.availGb} GB free]`);

      console.log(`\n\x1b[1mTop RAM Consuming Processes:\x1b[0m`);
      console.log(`  PID      RAM%   CPU%   COMMAND`);
      for (const p of summary.topProcesses) {
        console.log(`  ${p.pid.padEnd(8)} ${(p.mem + '%').padEnd(6)} ${(p.cpu + '%').padEnd(6)} ${p.cmd}`);
      }

      if (summary.docker && summary.docker.length > 0) {
        console.log(`\n\x1b[1mDocker Containers:\x1b[0m`);
        for (const c of summary.docker) {
          const icon = c.running ? '\x1b[32m●\x1b[0m' : '\x1b[31m○\x1b[0m';
          console.log(`  ${icon} ${c.name.padEnd(20)} ${c.status}`);
        }
      }
      console.log('');
      break;
    }

    case 'notify': {
      const msg = args.slice(1).join(' ');
      if (!msg) {
        console.error('Error: Message text required.');
        process.exit(1);
      }
      const res = await Notifier.dispatch('Manual Notice', msg, { level: 'info' });
      console.log('✓ Dispatched:', res);
      break;
    }

    case 'alert': {
      const msg = args.slice(1).join(' ');
      if (!msg) {
        console.error('Error: Message text required.');
        process.exit(1);
      }
      const res = await Notifier.dispatch('Urgent Alert', msg, { level: 'critical' });
      console.log('✓ Alert Dispatched:', res);
      break;
    }

    case 'run': {
      const dashIdx = args.indexOf('--');
      let cmdStr = '';
      let tag = null;

      const tagIdx = args.indexOf('--tag');
      if (tagIdx !== -1 && args[tagIdx + 1]) {
        tag = args[tagIdx + 1];
      }

      if (dashIdx !== -1) {
        cmdStr = args.slice(dashIdx + 1).join(' ');
      } else {
        cmdStr = args.slice(1).join(' ');
      }

      if (!cmdStr) {
        console.error('Error: Command string required. Usage: pocketops run -- "command"');
        process.exit(1);
      }

      const res = await runMonitoredCommand(cmdStr, { tag });
      process.exit(res.code);
      break;
    }

    case 'clean': {
      console.log('\x1b[36m[*] Running safe cache cleanup...\x1b[0m');
      const res = await cleanSafeCaches();
      const disk = await getDiskMetrics('/');
      console.log('\x1b[32m✓ Cleanup completed:\x1b[0m');
      if (res.cleaned.length) {
        res.cleaned.forEach(c => console.log(`  • ${c}`));
      } else {
        console.log('  • No purgeable junk found');
      }
      console.log(`  💾 Free Disk: ${disk.availGb} GB (${disk.usedPercent}% used)\n`);
      break;
    }

    case 'config': {
      const key = args[1];
      const val = args[2];
      if (!key) {
        const conf = ConfigManager.load();
        console.log('\x1b[1mCurrent Configuration:\x1b[0m');
        console.log(JSON.stringify(conf, null, 2));
      } else if (!val) {
        console.log(`${key} = ${ConfigManager.get(key)}`);
      } else {
        ConfigManager.set(key, val);
        console.log(`\x1b[32m✓ Config updated: ${key} = ${val}\x1b[0m`);
      }
      break;
    }

    case 'daemon': {
      const portIdx = args.indexOf('--port');
      const port = portIdx !== -1 ? parseInt(args[portIdx + 1], 10) : 9090;

      const daemon = new PocketOpsDaemon({ port });
      await daemon.start();

      console.log(`\x1b[1;32m⚡ PocketOps Sentinel Daemon is ACTIVE\x1b[0m`);
      console.log(`  • Mobile Web HUD: \x1b[1;33mhttp://0.0.0.0:${port}\x1b[0m`);
      console.log(`  • Disk Watchdog:  Active (checking every 60s)`);
      console.log(`  • Press Ctrl+C to stop.`);

      process.on('SIGINT', async () => {
        console.log('\nStopping PocketOps daemon...');
        await daemon.stop();
        process.exit(0);
      });
      break;
    }

    case 'help':
    case '--help':
    case '-h':
    default:
      printHelp();
      break;
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
