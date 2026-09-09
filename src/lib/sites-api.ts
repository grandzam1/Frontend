import type { Site } from './site';

const PIN_KEY = 'zam-viewer-admin-pin';

export function storeAdminPin(pin: string) {
  window.sessionStorage.setItem('zam-viewer-admin-unlocked', 'true');
  window.sessionStorage.setItem(PIN_KEY, pin);
}

export function clearAdminPin() {
  window.sessionStorage.removeItem('zam-viewer-admin-unlocked');
  window.sessionStorage.removeItem(PIN_KEY);
}

function adminHeaders() {
  const pin = window.sessionStorage.getItem(PIN_KEY) ?? '';
  return {
    'content-type': 'application/json',
    'x-admin-pin': pin,
  };
}

async function parseSites(response: Response) {
  const payload = (await response.json()) as Site[] | { error?: string };
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload
        ? payload.error
        : 'Could not load sites.';
    throw new Error(message || 'Could not load sites.');
  }
  return payload as Site[];
}

export async function fetchPublishedSites() {
  const response = await fetch('/api/sites');
  return parseSites(response);
}

export async function fetchAllSites() {
  const response = await fetch('/api/sites?all=1', { headers: adminHeaders() });
  return parseSites(response);
}

export async function persistSites(sites: Site[]) {
  const response = await fetch('/api/sites', {
    method: 'PUT',
    headers: adminHeaders(),
    body: JSON.stringify(sites),
  });
  return parseSites(response);
}

export async function persistSite(site: Site) {
  const response = await fetch('/api/sites', {
    method: 'POST',
    headers: adminHeaders(),
    body: JSON.stringify(site),
  });
  return parseSites(response);
}

export async function removeSiteRecord(slug: string) {
  const response = await fetch(`/api/sites?slug=${encodeURIComponent(slug)}`, {
    method: 'DELETE',
    headers: adminHeaders(),
  });
  return parseSites(response);
}

export async function unlockAdmin(pin: string) {
  const response = await fetch('/api/sites?all=1', {
    headers: { 'x-admin-pin': pin.trim() },
  });

  if (response.ok) {
    storeAdminPin(pin.trim());
    return { ok: true as const };
  }

  if (response.status === 401) {
    return { ok: false as const, message: 'That PIN is not correct.' };
  }

  let message = `Unlock failed (${response.status}).`;
  try {
    const payload = (await response.json()) as { error?: string };
    if (payload.error) {
      message = payload.error;
    }
  } catch {
    message =
      'Unlock failed. The admin API may be blocked by Vercel Authentication.';
  }

  return { ok: false as const, message };
}
