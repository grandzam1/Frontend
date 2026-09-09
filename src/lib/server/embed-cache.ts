import type { EmbedCheckResult } from '../embed-policy';
import { getSql } from './db';

const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type EmbedRow = {
  url: string;
  embeddable: boolean;
  reason: string;
  x_frame_options: string | null;
  content_security_policy: string | null;
  checked_at: string | Date;
};

function mapEmbed(row: EmbedRow): EmbedCheckResult {
  return {
    url: row.url,
    embeddable: row.embeddable,
    reason: row.reason,
    xFrameOptions: row.x_frame_options,
    contentSecurityPolicy: row.content_security_policy,
    checkedAt: new Date(row.checked_at).toISOString(),
  };
}

export async function readEmbedCheck(url: string) {
  const sql = getSql();
  const rows = (await sql`
    SELECT url, embeddable, reason, x_frame_options, content_security_policy, checked_at
    FROM embed_checks
    WHERE url = ${url}
  `) as EmbedRow[];
  const row = rows[0];
  if (!row) {
    return null;
  }
  const result = mapEmbed(row);
  const checked = Date.parse(result.checkedAt);
  if (!Number.isFinite(checked) || Date.now() - checked > CACHE_TTL_MS) {
    return null;
  }
  return result;
}

export async function writeEmbedCheck(result: EmbedCheckResult) {
  const sql = getSql();
  await sql`
    INSERT INTO embed_checks (
      url, embeddable, reason, x_frame_options, content_security_policy, checked_at
    )
    VALUES (
      ${result.url},
      ${result.embeddable},
      ${result.reason},
      ${result.xFrameOptions},
      ${result.contentSecurityPolicy},
      ${result.checkedAt}
    )
    ON CONFLICT (url) DO UPDATE SET
      embeddable = EXCLUDED.embeddable,
      reason = EXCLUDED.reason,
      x_frame_options = EXCLUDED.x_frame_options,
      content_security_policy = EXCLUDED.content_security_policy,
      checked_at = EXCLUDED.checked_at
  `;
}
