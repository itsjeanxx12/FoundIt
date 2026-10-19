import test from 'node:test';
import assert from 'node:assert/strict';
import { createItemsApi } from '../lib/items-api.js';
import { MAX_PHOTO_BYTES } from '../lib/constants.js';

const id = 'a0000000-0000-4000-8000-000000000001';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64');
function fixture(options = {}) {
  const rows = [];
  const uploads = [];
  const removed = [];
  const logs = [];
  let calls = 0;
  const storage = {
    getPublicUrl: (path) => ({ data: { publicUrl: `https://example.supabase.co/storage/v1/object/public/item-photos/${path}` } }),
    upload: async (path, bytes) => { uploads.push({ path, bytes }); return { error: options.uploadError }; },
    remove: async (paths) => { removed.push(...paths); return { error: options.cleanupError }; },
  };
  const client = {
    storage: { from: () => storage },
    from: () => {
      calls++;
      return {
        select: () => {
          const query = { order: () => query, range: async (from, to) => ({ data: rows.slice(from, to + 1), error: options.readError }) };
          return query;
        },
        insert: (values) => ({ select: () => ({ single: async () => {
          if (options.insertThrows) throw new Error('private upstream error');
          if (options.insertError) return { error: options.insertError };
          const item = { ...values, id, created_at: '2026-10-19T12:00:00Z' };
          rows.unshift(item);
          return { data: item };
        } }) }),
        update: (values) => ({ eq: (_, itemId) => ({ select: () => ({ maybeSingle: async () => {
          const item = rows.find((row) => row.id === itemId);
          if (item) Object.assign(item, values);
          return { data: item || null, error: options.updateError };
        } }) }) }),
      };
    },
  };
  const api = createItemsApi({ getSupabase: () => client, getPassword: () => options.password === null ? undefined : 'test-password', log: (message) => logs.push(message) });
  return { api, rows, uploads, removed, logs, calls: () => calls };
}
function post(overrides = {}, password = 'test-password') {
  const form = new FormData();
  const values = { title: 'Blue bottle', description: 'Found by the library', category: 'Other', date_found: '2026-10-19',
    photo: new File([png], 'bottle.png', { type: 'image/png' }), ...overrides };
  for (const [key, value] of Object.entries(values)) if (value !== null) form.set(key, value);
  return new Request('http://localhost/api/items', { method: 'POST', headers: { 'x-staff-password': password }, body: form });
}
function patch(payload, password = 'test-password', extraHeaders = {}) {
  return new Request('http://localhost/api/items', { method: 'PATCH', headers: {
    'Content-Type': 'application/json', 'x-staff-password': password, ...extraHeaders,
  }, body: JSON.stringify(payload) });
}

test('create, public list on a fresh request, update and relist preserve records and photo URL', async () => {
  const f = fixture();
  const response = await f.api.POST(post({ collection_location: 'Somewhere else', returned: 'true' }));
  assert.equal(response.status, 201);
  const { item } = await response.json();
  assert.equal(item.collection_location, 'School reception');
  assert.equal(item.returned, false);
  assert.match(item.photo_url, /\/item-photos\/[\w-]+\.png$/);
  assert.equal(f.uploads.length, 1);
  assert.deepEqual(f.uploads[0].bytes, png);
  const listed = await f.api.GET(new Request('http://localhost/api/items'));
  assert.equal(listed.headers.get('cache-control'), 'no-store');
  assert.equal((await listed.json()).items[0].id, item.id);
  assert.equal((await f.api.PATCH(patch({ id: item.id, returned: true }))).status, 200);
  assert.equal((await (await f.api.GET()).json()).items[0].returned, true);
  assert.equal((await f.api.PATCH(patch({ id: item.id, returned: false }))).status, 200);
  assert.equal((await (await f.api.GET()).json()).items[0].returned, false);
});

test('wrong and missing passwords cannot write or reach Supabase', async () => {
  const f = fixture();
  for (const password of ['', 'wrong']) {
    assert.equal((await f.api.POST(post({}, password))).status, 401);
    assert.equal((await f.api.PATCH(patch({ id, returned: true }, password))).status, 401);
  }
  assert.equal(f.calls(), 0);
  assert.equal(f.uploads.length, 0);
});

test('unconfigured staff password fails closed', async () => {
  assert.equal((await fixture({ password: null }).api.POST(post())).status, 503);
});

test('rejects cross-origin writes', async () => {
  assert.equal((await fixture().api.PATCH(patch({ id, returned: true }, 'test-password', { Origin: 'https://elsewhere.example' }))).status, 403);
});

test('validates required text, limits, categories, calendar dates and photo signature', async () => {
  const invalid = [
    { title: '' }, { title: ' ' }, { title: 'x'.repeat(101) }, { description: null },
    { description: 'x'.repeat(1001) }, { category: 'Toys' }, { date_found: '2026-02-30' },
    { date_found: '0000-01-01' }, { date_found: '19/10/2026' }, { photo: null },
    { photo: new File([], 'empty.png', { type: 'image/png' }) },
    { photo: new File(['not a photo'], 'fake.png', { type: 'image/png' }) },
    { photo: new File([png], 'fake.svg', { type: 'image/svg+xml' }) },
    { photo: new File([png], 'fake.jpg', { type: 'image/jpeg' }) },
  ];
  for (const values of invalid) {
    const f = fixture();
    assert.equal((await f.api.POST(post(values))).status, 400, JSON.stringify(values));
    assert.equal(f.uploads.length, 0);
  }
});

test('accepts JPEG and WebP signatures and exact text limits', async () => {
  for (const [type, bytes, extension] of [
    ['image/jpeg', Buffer.from([255, 216, 255, 224]), 'jpg'],
    ['image/webp', Buffer.from('RIFF0000WEBP'), 'webp'],
  ]) {
    const f = fixture();
    assert.equal((await f.api.POST(post({ title: 'x'.repeat(100), description: 'x'.repeat(1000),
      photo: new File([bytes], 'photo', { type }) }))).status, 201);
    assert.ok(f.uploads[0].path.endsWith(`.${extension}`));
  }
});

test('rejects photos above 2 MiB and accepts exactly 2 MiB', async () => {
  for (const [size, status] of [[MAX_PHOTO_BYTES, 201], [MAX_PHOTO_BYTES + 1, 413]]) {
    const bytes = Buffer.alloc(size); png.copy(bytes);
    assert.equal((await fixture().api.POST(post({ photo: new File([bytes], 'photo.png', { type: 'image/png' }) }))).status, status);
  }
});

test('bounds streamed body size without relying on Content-Length', async () => {
  const request = new Request('http://localhost/api/items', { method: 'POST',
    headers: { 'x-staff-password': 'test-password', 'Content-Type': 'multipart/form-data; boundary=x' },
    body: new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_PHOTO_BYTES + 65537)); controller.close(); } }), duplex: 'half' });
  assert.equal((await fixture().api.POST(request)).status, 413);
});

test('insert errors and thrown exceptions trigger uploaded-photo cleanup', async () => {
  for (const options of [{ insertError: new Error('private') }, { insertThrows: true }]) {
    const f = fixture(options);
    const response = await f.api.POST(post());
    assert.equal(response.status, 503);
    assert.deepEqual(f.removed, [f.uploads[0].path]);
    assert.equal(JSON.stringify(await response.json()).includes('private'), false);
  }
});

test('cleanup failure is reported internally without exposing upstream details', async () => {
  const f = fixture({ insertError: new Error('private'), cleanupError: new Error('secret') });
  assert.equal((await f.api.POST(post())).status, 503);
  assert.ok(f.logs.some((message) => message.includes('orphaned')));
  assert.equal(f.logs.join(' ').includes('secret'), false);
});

test('upload failure prevents inserting a record', async () => {
  const f = fixture({ uploadError: new Error('private') });
  assert.equal((await f.api.POST(post())).status, 503);
  assert.equal(f.calls(), 0);
  assert.equal(f.removed.length, 0);
});

test('PATCH rejects invalid IDs and non-boolean values, returns 404 for missing item', async () => {
  for (const payload of [null, {}, { id: 'invalid', returned: true }, { id, returned: 'true' }, { id, returned: 1 }]) {
    assert.equal((await fixture().api.PATCH(patch(payload))).status, 400);
  }
  assert.equal((await fixture().api.PATCH(patch({ id, returned: true }))).status, 404);
});

test('malformed payloads and wrong content types receive controlled errors', async () => {
  const api = fixture().api;
  assert.equal((await api.PATCH(new Request('http://localhost/api/items', { method: 'PATCH',
    headers: { 'x-staff-password': 'test-password', 'Content-Type': 'application/json' }, body: '{' }))).status, 400);
  assert.equal((await api.POST(new Request('http://localhost/api/items', { method: 'POST',
    headers: { 'x-staff-password': 'test-password', 'Content-Type': 'multipart/form-data' }, body: 'broken' }))).status, 400);
  assert.equal((await api.POST(new Request('http://localhost/api/items', { method: 'POST',
    headers: { 'x-staff-password': 'test-password', 'Content-Type': 'text/plain' }, body: 'broken' }))).status, 415);
});

test('GET reads past a database page and handles upstream failure', async () => {
  const f = fixture();
  f.rows.push(...Array.from({ length: 201 }, (_, i) => ({ id: String(i), photo_path: 'photo.png' })));
  assert.equal((await (await f.api.GET()).json()).items.length, 201);
  assert.equal((await fixture({ readError: new Error('private') }).api.GET()).status, 503);
});
