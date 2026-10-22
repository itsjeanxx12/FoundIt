import { createClient } from '@supabase/supabase-js';
import { getStaffPassword, getSupabaseConfig } from '../lib/server-config.js';
import { BUCKET, MAX_PHOTO_BYTES } from '../lib/constants.js';

// Node loads .env.local via the npm script; existing environment variables win.
try {
  getStaffPassword();
  const { url, key } = getSupabaseConfig();
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, {
      ...init, signal: AbortSignal.timeout(15000),
    }) },
  });
  const { error } = await client.from('items')
    .select('id,title,description,photo_path,category,date_found,collection_location,returned,created_at').limit(1);
  if (error) throw new Error('Cannot read the items table. Check your URL, server key, and SQL migration.');
  const { data: bucket, error: bucketError } = await client.storage.getBucket(BUCKET);
  if (bucketError) throw new Error('Cannot read item-photos bucket settings. Check your server key and migration.');
  if (!bucket.public || Number(bucket.file_size_limit) !== MAX_PHOTO_BYTES ||
      bucket.allowed_mime_types?.length !== 3 ||
      !['image/jpeg', 'image/png', 'image/webp'].every((mime) => bucket.allowed_mime_types.includes(mime))) {
    throw new Error('The item-photos bucket must be public, limited to 2 MiB, and allow only JPEG, PNG, and WebP.');
  }
  console.log('Setup check passed: staff password, Supabase connection, items columns, and photo bucket settings.');
  console.log('Next: run supabase/verify.sql and manually add/return an item to verify permissions and writes.');
} catch (error) {
  // Only our own configuration messages are shown; never print upstream errors.
  const safe = /^(Set |SUPABASE_URL |Cannot read |The item-photos )/.test(error.message);
  console.error(safe ? error.message : 'Setup check failed. Check network access and Supabase project availability.');
  process.exitCode = 1;
}
