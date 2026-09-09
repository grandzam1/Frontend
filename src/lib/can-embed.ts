import type { EmbedCheckResult } from './embed-policy';

export type { EmbedCheckResult };

function cacheKey(url: string) {
  return url.trim().replace(/\/$/, '');
}

export async function canEmbed(url: string): Promise<EmbedCheckResult> {
  const key = cacheKey(url);
  const response = await fetch(`/api/can-embed?url=${encodeURIComponent(key)}`);
  const payload = (await response.json()) as EmbedCheckResult & { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || 'Could not check whether that URL can be iframed.');
  }
  return payload;
}
