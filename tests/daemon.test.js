import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PocketOpsDaemon } from '../src/daemon.js';

test('PocketOpsDaemon starts HTTP server and responds with metrics', async () => {
  const daemon = new PocketOpsDaemon({ port: 9199 });
  await daemon.start();

  const res = await fetch('http://127.0.0.1:9199/api/metrics');
  assert.equal(res.status, 200);

  const data = await res.json();
  assert.ok(data.hostname);
  assert.ok(data.disk);
  assert.ok(data.memory);

  const hudRes = await fetch('http://127.0.0.1:9199/');
  assert.equal(hudRes.status, 200);
  const hudHtml = await hudRes.text();
  assert.ok(hudHtml.includes('POCKETOPS'));

  await daemon.stop();
});
