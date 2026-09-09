import { inspectEmbedPolicy } from '../embed-policy';
import { readEmbedCheck, writeEmbedCheck } from './embed-cache';
import { updateSitesEmbed } from './sites';

export async function canEmbedHandler(request: Request) {
  const target = new URL(request.url).searchParams.get('url');
  if (!target) {
    return Response.json({ error: 'Missing url.' }, { status: 400 });
  }

  try {
    const cached = await readEmbedCheck(target.trim().replace(/\/$/, ''));
    if (cached) {
      return Response.json(cached, {
        headers: { 'cache-control': 'public, max-age=3600' },
      });
    }

    const result = await inspectEmbedPolicy(target);
    await writeEmbedCheck(result);
    await updateSitesEmbed(
      result.url,
      result.embeddable,
      result.reason,
      result.checkedAt,
    );
    return Response.json(result, {
      headers: { 'cache-control': 'public, max-age=3600' },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not check that URL.';
    const status =
      message.startsWith('Use an HTTPS') || message.includes('cannot be')
        ? 400
        : 502;
    return Response.json({ error: message }, { status });
  }
}
