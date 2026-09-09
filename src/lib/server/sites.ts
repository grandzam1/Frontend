import type { Site } from '../site';
import { getSql } from './db';

type SiteRow = {
  slug: string;
  name: string;
  url: string;
  description: string;
  published: boolean;
  is_default: boolean;
  embeddable: boolean | null;
  embed_checked_at: string | Date | null;
  embed_reason: string | null;
};

function mapSite(row: SiteRow): Site {
  return {
    slug: row.slug,
    name: row.name,
    url: row.url,
    description: row.description,
    published: row.published,
    isDefault: row.is_default || undefined,
    embeddable: row.embeddable ?? undefined,
    embedCheckedAt: row.embed_checked_at
      ? new Date(row.embed_checked_at).toISOString()
      : undefined,
    embedReason: row.embed_reason ?? undefined,
  };
}

export async function listSites(publishedOnly: boolean) {
  const sql = getSql();
  const rows = publishedOnly
    ? await sql`
        SELECT slug, name, url, description, published, is_default,
               embeddable, embed_checked_at, embed_reason
        FROM sites
        WHERE published = TRUE
        ORDER BY name
      `
    : await sql`
        SELECT slug, name, url, description, published, is_default,
               embeddable, embed_checked_at, embed_reason
        FROM sites
        ORDER BY name
      `;
  return (rows as SiteRow[]).map(mapSite);
}

export async function upsertSite(site: Site) {
  const sql = getSql();
  await sql`
    INSERT INTO sites (
      slug, name, url, description, published, is_default,
      embeddable, embed_checked_at, embed_reason, updated_at
    )
    VALUES (
      ${site.slug},
      ${site.name},
      ${site.url},
      ${site.description},
      ${site.published},
      ${Boolean(site.isDefault)},
      ${site.embeddable ?? null},
      ${site.embedCheckedAt ?? null},
      ${site.embedReason ?? null},
      NOW()
    )
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      url = EXCLUDED.url,
      description = EXCLUDED.description,
      published = EXCLUDED.published,
      is_default = EXCLUDED.is_default,
      embeddable = EXCLUDED.embeddable,
      embed_checked_at = EXCLUDED.embed_checked_at,
      embed_reason = EXCLUDED.embed_reason,
      updated_at = NOW()
  `;
}

export async function replaceSites(sites: Site[]) {
  const sql = getSql();
  const slugs = sites.map((site) => site.slug);

  if (slugs.length === 0) {
    await sql`DELETE FROM sites`;
    return [];
  }

  for (const site of sites) {
    await upsertSite(site);
  }

  await sql`DELETE FROM sites WHERE NOT (slug = ANY(${slugs}))`;
  return listSites(false);
}

export async function deleteSite(slug: string) {
  const sql = getSql();
  await sql`DELETE FROM sites WHERE slug = ${slug}`;
}

export async function updateSitesEmbed(url: string, embeddable: boolean, reason: string, checkedAt: string) {
  const sql = getSql();
  await sql`
    UPDATE sites
    SET embeddable = ${embeddable},
        embed_reason = ${reason},
        embed_checked_at = ${checkedAt},
        updated_at = NOW()
    WHERE url = ${url}
  `;
}
