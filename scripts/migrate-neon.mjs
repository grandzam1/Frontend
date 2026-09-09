import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

function loadEnv() {
  const path = resolve(process.cwd(), '.env.local');
  const text = readFileSync(path, 'utf8');
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index === -1) continue;
    const key = trimmed.slice(0, index);
    const value = trimmed.slice(index + 1);
    if (!process.env[key]) process.env[key] = value;
  }
}

loadEnv();

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set.');
  const parsed = new URL(url);
  parsed.searchParams.delete('channel_binding');
  if (!parsed.searchParams.get('sslmode')) {
    parsed.searchParams.set('sslmode', 'require');
  }
  return parsed.toString();
}

const sql = neon(databaseUrl());

await sql`
  CREATE TABLE IF NOT EXISTS sites (
    slug TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    published BOOLEAN NOT NULL DEFAULT TRUE,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    embeddable BOOLEAN,
    embed_checked_at TIMESTAMPTZ,
    embed_reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

await sql`
  CREATE TABLE IF NOT EXISTS embed_checks (
    url TEXT PRIMARY KEY,
    embeddable BOOLEAN NOT NULL,
    reason TEXT NOT NULL,
    x_frame_options TEXT,
    content_security_policy TEXT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

await sql`
  INSERT INTO sites (
    slug, name, url, description, published, is_default,
    embeddable, embed_checked_at, embed_reason
  )
  VALUES (
    'zam',
    'Zam',
    'https://spacex.starstruckinfo.net/zam',
    'The original Zam experience.',
    TRUE,
    TRUE,
    TRUE,
    '2026-09-09T11:10:37.000Z',
    'No X-Frame-Options or CSP frame-ancestors header'
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

const rows = await sql`SELECT slug, name, published, is_default FROM sites ORDER BY name`;
console.log(JSON.stringify({ ok: true, sites: rows }, null, 2));
