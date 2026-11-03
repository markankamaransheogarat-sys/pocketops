import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getDiskMetrics, getMemoryMetrics, getCpuMetrics, getTopProcesses, getSystemSummary } from '../src/system.js';

test('getDiskMetrics parses root filesystem correctly', async () => {
  const disk = await getDiskMetrics('/');
  assert.ok(parseFloat(disk.totalGb) > 0);
  assert.ok(parseFloat(disk.usedGb) >= 0);
  assert.ok(parseFloat(disk.availGb) >= 0);
  assert.ok(disk.usedPercent >= 0 && disk.usedPercent <= 100);
});

test('getMemoryMetrics retrieves host RAM correctly', () => {
  const mem = getMemoryMetrics();
  assert.ok(mem.totalMb > 0);
  assert.ok(mem.usedMb > 0);
  assert.ok(mem.usedPercent >= 0 && mem.usedPercent <= 100);
});

test('getCpuMetrics returns load averages and cores', () => {
  const cpu = getCpuMetrics();
  assert.ok(cpu.cores > 0);
  assert.ok(cpu.load1 !== undefined);
  assert.ok(cpu.load5 !== undefined);
});

test('getTopProcesses returns active process list', async () => {
  const procs = await getTopProcesses(3);
  assert.ok(Array.isArray(procs));
  assert.ok(procs.length > 0);
  assert.ok(procs[0].pid);
});

test('getSystemSummary combines all metrics', async () => {
  const summary = await getSystemSummary();
  assert.ok(summary.hostname);
  assert.ok(summary.uptime);
  assert.ok(summary.disk);
  assert.ok(summary.memory);
  assert.ok(summary.cpu);
});
