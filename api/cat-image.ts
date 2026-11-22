import { fetchCatImage, IMAGE_CACHE_CONTROL, readSupabaseEnv } from './_lib/worldCats';

export async function GET(request: Request) {
  const env = readSupabaseEnv(process.env);
  if (!env) return new Response('Not configured', { status: 503 });

  const params = new URL(request.url).searchParams;
  const id = params.get('id') ?? '';
  const kind = params.get('kind') === 'hero' ? 'hero' : 'card';

  try {
    const image = await fetchCatImage(env, id, kind);
    if (!image) return new Response('Not found', { status: 404 });
    return new Response(image.bytes, {
      headers: { 'Content-Type': image.contentType, 'Cache-Control': IMAGE_CACHE_CONTROL },
    });
  } catch (error) {
    console.error(error);
    return new Response('Upstream error', { status: 502 });
  }
}
