// Smoke-test the real production HTTP server without contacting Supabase.
import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';

const port = 3187;
const origin = `http://127.0.0.1:${port}`;
let output = '';
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '-H', '127.0.0.1', '-p', String(port)], {
  env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1', SUPABASE_URL: '', SUPABASE_SECRET_KEY: '', STAFF_PASSWORD: 'smoke-only-long-random-password-123456' },
  stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true,
});
child.stdout.on('data', (chunk) => { output += chunk; });
child.stderr.on('data', (chunk) => { output += chunk; });
let exited = false;
child.on('exit', () => { exited = true; });
try {
  let ready = false;
  for (let i = 0; i < 80; i++) {
    if (exited) throw new Error(`Production server exited: ${output}`);
    try {
      const response = await fetch(origin, { signal: AbortSignal.timeout(1000) });
      if (response.ok) { ready = true; break; }
    } catch { /* Wait for the server to listen. */ }
    await setTimeout(250);
  }
  assert.ok(ready, 'production server must start');
  const html = await (await fetch(origin)).text();
  assert.ok(html.includes('Found items'));
  assert.ok(html.includes('School reception'));
  assert.ok(!html.includes('smoke-only-long-random-password-123456'), 'staff password must not appear in HTML');
  let response = await fetch(`${origin}/api/items`);
  assert.equal(response.status, 503, 'GET without Supabase config fails cleanly');
  assert.equal(response.headers.get('x-frame-options'), 'DENY');
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(response.headers.get('x-powered-by'), null);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  for (const method of ['POST', 'PATCH']) {
    response = await fetch(`${origin}/api/items`, { method, headers: { 'x-staff-password': 'wrong' } });
    assert.equal(response.status, 401, `${method} rejects incorrect staff password`);
  }
  response = await fetch(`${origin}/api/items`, { method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-staff-password': 'smoke-only-long-random-password-123456' },
    body: JSON.stringify({ id: 'bad', returned: 'true' }) });
  assert.equal(response.status, 400, 'authenticated request validates inputs');
  response = await fetch(`${origin}/api/items`, { method: 'PATCH',
    headers: { 'Content-Type': 'application/json', 'x-staff-password': 'smoke-only-long-random-password-123456' },
    body: JSON.stringify({ id: 'a0000000-0000-4000-8000-000000000001', returned: true }) });
  assert.equal(response.status, 503, 'valid request without Supabase fails cleanly');
  response = await fetch(`${origin}/api/items`, { method: 'DELETE' });
  assert.equal(response.status, 405, 'unsupported HTTP method rejected');
  console.log('Production HTTP smoke checks passed: page, password isolation, authorization, validation, missing-config handling, cache headers, and method restriction.');
} finally {
  child.kill();
}
