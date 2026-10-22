import test from 'node:test';
import assert from 'node:assert/strict';
import { getStaffPassword, getSupabaseConfig } from '../lib/server-config.js';

const config = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SECRET_KEY: 'sb_secret_example' };

test('rejects missing, placeholder, short, and padded staff passwords', () => {
  for (const STAFF_PASSWORD of [undefined, '', 'short', 'REPLACE_WITH_A_LONG_RANDOM_PASSWORD', ' abcdefghijklmnopqrstuvwxyz']) {
    assert.throws(() => getStaffPassword({ STAFF_PASSWORD }));
  }
  assert.equal(getStaffPassword({ STAFF_PASSWORD: 'a-long-random-value-0123456789' }), 'a-long-random-value-0123456789');
});

test('accepts server keys and rejects public keys and invalid project URLs', () => {
  assert.deepEqual(getSupabaseConfig(config), { url: config.SUPABASE_URL, key: config.SUPABASE_SECRET_KEY });
  const jwt = (role) => `header.${Buffer.from(JSON.stringify({ role })).toString('base64url')}.signature`;
  assert.equal(getSupabaseConfig({ ...config, SUPABASE_SECRET_KEY: jwt('service_role') }).key, jwt('service_role'));
  for (const SUPABASE_SECRET_KEY of [undefined, '', 'YOUR_SERVER_SECRET_KEY', 'sb_publishable_example', jwt('anon')]) {
    assert.throws(() => getSupabaseConfig({ ...config, SUPABASE_SECRET_KEY }));
  }
  for (const SUPABASE_URL of [undefined, 'bad', 'http://example.com', 'https://YOUR_PROJECT_REF.supabase.co', 'https://example.com/path', 'https://user:pass@example.com']) {
    assert.throws(() => getSupabaseConfig({ ...config, SUPABASE_URL }));
  }
  assert.equal(getSupabaseConfig({ ...config, SUPABASE_URL: 'http://127.0.0.1:54321' }).url, 'http://127.0.0.1:54321');
});
