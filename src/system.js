import os from 'node:os';
import { exec, execSync } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';

const execAsync = promisify(exec);

export async function getDiskMetrics(mountPoint = '/') {
  try {
    const { stdout } = await execAsync(`df -Pk "${mountPoint}"`);
    const lines = stdout.trim().split('\n');
    if (lines.length < 2) throw new Error('Invalid df output');

    const parts = lines[1].trim().split(/\s+/);
    // Filesystem, 1024-blocks, Used, Available, Capacity, Mounted on
    const totalKb = parseInt(parts[1], 10);
    const usedKb = parseInt(parts[2], 10);
    const availKb = parseInt(parts[3], 10);
    const capacityStr = parts[4];
    const usedPercent = parseInt(capacityStr.replace('%', ''), 10);

    return {
      mount: parts[5] || mountPoint,
      totalGb: (totalKb / 1024 / 1024).toFixed(2),
      usedGb: (usedKb / 1024 / 1024).toFixed(2),
      availGb: (availKb / 1024 / 1024).toFixed(2),
      usedPercent,
      isWarning: usedPercent >= 80,
      isCritical: usedPercent >= 90,
    };
  } catch (err) {
    return {
      mount: mountPoint,
      totalGb: '0',
      usedGb: '0',
      availGb: '0',
      usedPercent: 0,
      error: err.message,
    };
  }
}

export function getMemoryMetrics() {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  const usedPercent = Math.round((used / total) * 100);

  return {
    totalMb: Math.round(total / 1024 / 1024),
    usedMb: Math.round(used / 1024 / 1024),
    freeMb: Math.round(free / 1024 / 1024),
    usedPercent,
    isWarning: usedPercent >= 85,
    isCritical: usedPercent >= 95,
  };
}

export function getCpuMetrics() {
  const loads = os.loadavg();
  const cpus = os.cpus();
  return {
    cores: cpus.length,
    model: cpus[0] ? cpus[0].model : 'Unknown',
    load1: loads[0].toFixed(2),
    load5: loads[1].toFixed(2),
    load15: loads[2].toFixed(2),
  };
}

export async function getTopProcesses(limit = 5) {
  try {
    const { stdout } = await execAsync(`ps -eo pid,cmd,%mem,%cpu --sort=-%mem | head -n ${limit + 1}`);
    const lines = stdout.trim().split('\n').slice(1);
    return lines.map(line => {
      const parts = line.trim().split(/\s+/);
      const pid = parts[0];
      const mem = parts[parts.length - 2];
      const cpu = parts[parts.length - 1];
      const cmd = parts.slice(1, parts.length - 2).join(' ');
      return { pid, cmd: cmd.length > 32 ? cmd.slice(0, 32) + '...' : cmd, mem, cpu };
    });
  } catch (err) {
    return [];
  }
}

export async function getDockerStatus() {
  try {
    const { stdout } = await execAsync('docker ps -a --format "{{.Names}}\t{{.Status}}\t{{.Image}}"');
    const lines = stdout.trim().split('\n').filter(Boolean);
    return lines.map(line => {
      const [name, status, image] = line.split('\t');
      return {
        name,
        status,
        image,
        running: status.startsWith('Up'),
      };
    });
  } catch (_) {
    return null; // Docker might not be installed / active
  }
}

export async function cleanSafeCaches() {
  const cleaned = [];
  let spaceRecoveredMb = 0;

  // 1. Pip cache
  try {
    const { stdout } = await execAsync('pip cache purge 2>/dev/null || true');
    if (stdout.includes('Files removed')) cleaned.push('pip cache purged');
  } catch (_) {}

  // 2. npm cache
  try {
    await execAsync('npm cache clean --force 2>/dev/null || true');
    cleaned.push('npm cache purged');
  } catch (_) {}

  // 3. /tmp old temp files (> 3 days)
  try {
    await execAsync('find /tmp -type f -atime +3 -delete 2>/dev/null || true');
    cleaned.push('/tmp stale files cleaned');
  } catch (_) {}

  return {
    cleaned,
    timestamp: Date.now(),
  };
}

export async function getSystemSummary() {
  const [disk, topProc, docker] = await Promise.all([
    getDiskMetrics('/'),
    getTopProcesses(5),
    getDockerStatus(),
  ]);

  const mem = getMemoryMetrics();
  const cpu = getCpuMetrics();
  const uptimeSec = os.uptime();
  const hours = Math.floor(uptimeSec / 3600);
  const minutes = Math.floor((uptimeSec % 3600) / 60);

  return {
    hostname: os.hostname(),
    uptime: `${hours}h ${minutes}m`,
    disk,
    memory: mem,
    cpu,
    topProcesses: topProc,
    docker,
  };
}
