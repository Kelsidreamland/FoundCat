import { FEED_CACHE_CONTROL, fetchWorldCatFeed, readSupabaseEnv } from './_lib/worldCats';

export async function GET() {
  const env = readSupabaseEnv(process.env);
  if (!env) {
    return Response.json({ error: 'cloud_not_configured' }, { status: 503 });
  }
  try {
    const cats = await fetchWorldCatFeed(env);
    return Response.json(cats, { headers: { 'Cache-Control': FEED_CACHE_CONTROL } });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'public_load_failed' }, { status: 502 });
  }
}
