// Shared by the server and the setup checker. Never import into client components.
export function getStaffPassword(env = process.env) {
  const password = env.STAFF_PASSWORD;
  if (!password || password.trim() !== password || password.length < 24 ||
      /REPLACE_WITH|YOUR_STAFF|test-password/i.test(password)) {
    throw new Error('Set STAFF_PASSWORD to a random password of at least 24 characters, without surrounding spaces.');
  }
  return password;
}

export function getSupabaseConfig(env = process.env) {
  let url;
  try { url = new URL(env.SUPABASE_URL); } catch {
    throw new Error('Set SUPABASE_URL to your Supabase project URL.');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username || url.password || url.search || url.hash || url.pathname !== '/' ||
      /YOUR_PROJECT/i.test(url.hostname)) {
    throw new Error('SUPABASE_URL must be an HTTPS project URL (HTTP is allowed for localhost).');
  }
  const key = env.SUPABASE_SECRET_KEY?.trim();
  let serviceRole = false;
  try {
    serviceRole = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString()).role === 'service_role';
  } catch { /* Modern secret keys are opaque, not JWTs. */ }
  if (!key || (!key.startsWith('sb_secret_') && !serviceRole)) {
    throw new Error('Set SUPABASE_SECRET_KEY to a secret key (sb_secret_...) or legacy service_role key, not a publishable/anon key.');
  }
  return { url: url.origin, key };
}
