import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

let sql: NeonQueryFunction<false, false> | null = null;

function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set.');
  }

  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('channel_binding');
    if (!parsed.searchParams.get('sslmode')) {
      parsed.searchParams.set('sslmode', 'require');
    }
    return parsed.toString();
  } catch {
    return url;
  }
}

export function getSql() {
  sql ??= neon(databaseUrl());
  return sql;
}

export function adminPin() {
  return process.env.ADMIN_PIN || '1234';
}

export function hasAdminPin(request: Request) {
  return request.headers.get('x-admin-pin') === adminPin();
}
