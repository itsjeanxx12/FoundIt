import { createItemsApi } from '../../../lib/items-api.js';
import { getSupabase } from '../../../lib/supabase.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const handlers = createItemsApi({ getSupabase });
export const GET = handlers.GET;
export const POST = handlers.POST;
export const PATCH = handlers.PATCH;
