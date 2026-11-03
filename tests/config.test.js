import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConfigManager } from '../src/config.js';

test('ConfigManager loads and updates keys', () => {
  const initial = ConfigManager.load();
  assert.ok(initial);

  ConfigManager.set('test_key_dummy', '12345');
  assert.equal(ConfigManager.get('test_key_dummy'), '12345');
});
