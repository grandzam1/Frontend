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
    headers: { 'x-admin-pin': pin },
  });
  if (!response.ok) {
    return false;
  }
  storeAdminPin(pin);
  return true;
}
