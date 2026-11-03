import { spawn } from 'node:child_process';
import { Notifier } from './notifier.js';

export function runMonitoredCommand(commandStr, options = {}) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const tag = options.tag || commandStr.slice(0, 32);

    console.log(`\x1b[36m[*] PocketOps tracking command execution: "${commandStr}"\x1b[0m\n`);

    const child = spawn(commandStr, {
      shell: true,
      stdio: ['inherit', 'pipe', 'pipe'],
    });

    let stdoutTail = [];
    let stderrTail = [];

    child.stdout.on('data', chunk => {
      process.stdout.write(chunk);
      const lines = chunk.toString().split('\n').filter(Boolean);
      stdoutTail.push(...lines);
      if (stdoutTail.length > 20) stdoutTail = stdoutTail.slice(-20);
    });

    child.stderr.on('data', chunk => {
      process.stderr.write(chunk);
      const lines = chunk.toString().split('\n').filter(Boolean);
      stderrTail.push(...lines);
      if (stderrTail.length > 20) stderrTail = stderrTail.slice(-20);
    });

    child.on('close', async (code) => {
      const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
      const isSuccess = code === 0;

      const summary = [
        `Command: \`${commandStr}\``,
        `Duration: *${durationSec}s*`,
        `Exit Code: *${code}*`,
      ];

      if (!isSuccess && stderrTail.length > 0) {
        summary.push(`\n*Last Error Output:*\n\`\`\`\n${stderrTail.slice(-8).join('\n')}\n\`\`\``);
      } else if (stdoutTail.length > 0) {
        summary.push(`\n*Output Snippet:*\n\`\`\`\n${stdoutTail.slice(-4).join('\n')}\n\`\`\``);
      }

      const title = isSuccess ? `Task Completed: ${tag}` : `Task Failed: ${tag}`;
      const level = isSuccess ? 'success' : 'critical';

      await Notifier.dispatch(title, summary.join('\n'), { level });

      resolve({
        code,
        durationSec: parseFloat(durationSec),
        isSuccess,
      });
    });
  });
}
