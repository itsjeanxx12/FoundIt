import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import { BUCKET, CATEGORIES, COLLECTION_LOCATION, MAX_PHOTO_BYTES } from './constants.js';

const MAX_BODY = MAX_PHOTO_BYTES + 64 * 1024;
const FIELDS = 'id,title,description,photo_path,category,date_found,collection_location,returned,created_at';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
const fail = (status, message) => { throw new HttpError(status, message); };
const json = (body, status = 200) => Response.json(body, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

function authorize(request, password) {
  if (!password) fail(503, 'Staff access is not configured.');
  const supplied = request.headers.get('x-staff-password') || '';
  const hash = (value) => createHash('sha256').update(value).digest();
  if (!timingSafeEqual(hash(supplied), hash(password))) fail(401, 'Incorrect staff password.');
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) fail(403, 'Cross-origin writes are not allowed.');
}

async function readBody(request, limit, type) {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith(type)) {
    fail(415, `Expected ${type}.`);
  }
  if (Number(request.headers.get('content-length')) > limit) fail(413, 'Request is too large.');
  const reader = request.body?.getReader();
  if (!reader) fail(400, 'Request body is required.');
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) { await reader.cancel(); fail(413, 'Request is too large.'); }
    chunks.push(value);
  }
  return new Response(Buffer.concat(chunks), { headers: { 'Content-Type': request.headers.get('content-type') } });
}

function requiredText(form, name, max) {
  const value = form.get(name);
  if (typeof value !== 'string' || !value.trim() || [...value.trim()].length > max) {
    fail(400, `${name} is required and must be at most ${max} characters.`);
  }
  return value.trim();
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value.startsWith('0000')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function photoExtension(bytes, mime) {
  if (mime === 'image/jpeg' && bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'jpg';
  if (mime === 'image/png' && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'png';
  if (mime === 'image/webp' && bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  fail(400, 'Photo must be a JPEG, PNG, or WebP with a matching file signature.');
}

// Inject dependencies for functional tests; production supplies the server-only client.
export function createItemsApi({ getSupabase, getPassword = () => process.env.STAFF_PASSWORD, log = console.error }) {
  const guarded = (handler) => async (request) => {
    try { return await handler(request); }
    catch (error) {
      if (error instanceof HttpError) return json({ error: error.message }, error.status);
      // Never log request bodies, passwords, credentials, or upstream error details.
      log('Items API operation failed.');
      return json({ error: 'Unable to complete the operation. Check server setup and try again.' }, 503);
    }
  };
  const withPhoto = (client, item) => ({
    ...item, photo_url: client.storage.from(BUCKET).getPublicUrl(item.photo_path).data.publicUrl,
  });
  return {
    GET: guarded(async () => {
      const client = getSupabase();
      // Page internally to avoid silently truncating at Supabase's default row cap.
      const items = [];
      for (let offset = 0; ; offset += 100) {
        const { data, error } = await client.from('items').select(FIELDS)
          .order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 99);
        if (error) throw error;
        items.push(...data.map((item) => withPhoto(client, item)));
        if (data.length < 100) break;
      }
      return json({ items });
    }),
    POST: guarded(async (request) => {
      authorize(request, getPassword());
      const body = await readBody(request, MAX_BODY, 'multipart/form-data');
      let form;
      try { form = await body.formData(); } catch { fail(400, 'Invalid multipart form data.'); }
      const title = requiredText(form, 'title', 100);
      const description = requiredText(form, 'description', 1000);
      const category = form.get('category');
      if (!CATEGORIES.includes(category)) fail(400, 'Choose a valid category.');
      const date_found = form.get('date_found');
      if (typeof date_found !== 'string' || !validDate(date_found)) fail(400, 'date_found must be a valid YYYY-MM-DD date.');
      const photo = form.get('photo');
      if (!photo || typeof photo.arrayBuffer !== 'function' || photo.size === 0) fail(400, 'A photo is required.');
      if (photo.size > MAX_PHOTO_BYTES) fail(413, 'Photo must be at most 2 MiB.');
      const bytes = Buffer.from(await photo.arrayBuffer());
      const extension = photoExtension(bytes, photo.type);
      const photo_path = `${randomUUID()}.${extension}`;
      const client = getSupabase();
      const storage = client.storage.from(BUCKET);
      const { error: uploadError } = await storage.upload(photo_path, bytes, { contentType: photo.type, upsert: false });
      if (uploadError) throw uploadError;
      let item;
      try {
        const { data, error } = await client.from('items').insert({
          title, description, category, date_found, photo_path,
          collection_location: COLLECTION_LOCATION, returned: false,
        }).select(FIELDS).single();
        if (error) throw error;
        item = data;
      } catch (error) {
        try {
          const { error: cleanupError } = await storage.remove([photo_path]);
          if (cleanupError) log('Photo cleanup failed; check the bucket for an orphaned photo.');
        } catch { log('Photo cleanup failed; check the bucket for an orphaned photo.'); }
        throw error;
      }
      return json({ item: withPhoto(client, item) }, 201);
    }),
    PATCH: guarded(async (request) => {
      authorize(request, getPassword());
      const body = await readBody(request, 4096, 'application/json');
      let payload;
      try { payload = await body.json(); } catch { fail(400, 'Invalid JSON.'); }
      if (!payload || typeof payload !== 'object' || !UUID.test(payload.id) || typeof payload.returned !== 'boolean') {
        fail(400, 'Supply a valid item id and a returned boolean.');
      }
      const client = getSupabase();
      const { data, error } = await client.from('items').update({ returned: payload.returned })
        .eq('id', payload.id).select(FIELDS).maybeSingle();
      if (error) throw error;
      if (!data) fail(404, 'Item not found.');
      return json({ item: withPhoto(client, data) });
    }),
  };
}
