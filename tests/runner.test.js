import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runMonitoredCommand } from '../src/runner.js';

test('runMonitoredCommand executes and returns execution metrics', async () => {
  const result = await runMonitoredCommand('echo "test_runner_ok"', { tag: 'Test' });
  assert.equal(result.code, 0);
  assert.equal(result.isSuccess, true);
  assert.ok(result.durationSec >= 0);
});
