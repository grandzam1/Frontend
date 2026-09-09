import { hasAdminPin } from './db';
import { deleteSite, listSites, replaceSites, upsertSite } from './sites';
import type { Site } from '../site';

function isSite(value: unknown): value is Site {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const site = value as Site;
  return (
    typeof site.slug === 'string' &&
    typeof site.name === 'string' &&
    typeof site.url === 'string' &&
    typeof site.description === 'string' &&
    typeof site.published === 'boolean'
  );
}

export async function sitesHandler(request: Request) {
  const url = new URL(request.url);
  const admin = hasAdminPin(request);

  try {
    if (request.method === 'GET') {
      const all = url.searchParams.get('all') === '1';
      if (all && !admin) {
        return Response.json({ error: 'Admin PIN required.' }, { status: 401 });
      }
      const sites = await listSites(all ? false : true);
      return Response.json(sites);
    }

    if (!admin) {
      return Response.json({ error: 'Admin PIN required.' }, { status: 401 });
    }

    if (request.method === 'POST') {
      const body = await request.json();
      if (!isSite(body)) {
        return Response.json({ error: 'Invalid site.' }, { status: 400 });
      }
      await upsertSite(body);
      return Response.json(await listSites(false));
    }

    if (request.method === 'PUT') {
      const body = await request.json();
      if (!Array.isArray(body) || !body.every(isSite)) {
        return Response.json({ error: 'Expected an array of sites.' }, { status: 400 });
      }
      return Response.json(await replaceSites(body));
    }

    if (request.method === 'DELETE') {
      const slug = url.searchParams.get('slug');
      if (!slug) {
        return Response.json({ error: 'Missing slug.' }, { status: 400 });
      }
      await deleteSite(slug);
      return Response.json(await listSites(false));
    }

    return Response.json({ error: 'Method not allowed.' }, { status: 405 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Database error.';
    return Response.json({ error: message }, { status: 500 });
  }
}
