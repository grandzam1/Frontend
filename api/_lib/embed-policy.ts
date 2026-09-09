export type EmbedCheckResult = {
  url: string;
  embeddable: boolean;
  reason: string;
  checkedAt: string;
  xFrameOptions: string | null;
  contentSecurityPolicy: string | null;
};

const FETCH_TIMEOUT_MS = 8000;

function collectHeader(headers: Headers, name: string) {
  const values: string[] = [];
  headers.forEach((value, key) => {
    if (key.toLowerCase() === name) {
      values.push(value);
    }
  });
  return values.join(',');
}

function isPrivateHostname(hostname: string) {
  const host = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    host === 'localhost' ||
    host === '::1' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal')
  ) {
    return true;
  }

  if (host === '0.0.0.0' || host.startsWith('127.') || host.startsWith('10.')) {
    return true;
  }

  if (host.startsWith('192.168.') || host.startsWith('169.254.')) {
    return true;
  }

  const match = /^172\.(\d+)\./.exec(host);
  if (match) {
    const octet = Number(match[1]);
    if (octet >= 16 && octet <= 31) {
      return true;
    }
  }

  return false;
}

export function assertPublicHttpsUrl(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:') {
    throw new Error('Use an HTTPS URL.');
  }
  if (url.username || url.password) {
    throw new Error('URLs with credentials cannot be checked.');
  }
  if (url.port && url.port !== '443') {
    throw new Error('Only HTTPS port 443 can be checked.');
  }
  if (isPrivateHostname(url.hostname)) {
    throw new Error('That host cannot be checked.');
  }
  return url;
}

function parseFrameAncestors(csp: string | null) {
  if (!csp) {
    return null;
  }

  const directives = csp.split(';').map((part) => part.trim());
  const frameAncestors = directives.find((directive) =>
    directive.toLowerCase().startsWith('frame-ancestors'),
  );
  if (!frameAncestors) {
    return null;
  }

  const sources = frameAncestors
    .slice('frame-ancestors'.length)
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  return sources;
}

export function policyFromHeaders(headers: Headers) {
  const xFrameOptions = collectHeader(headers, 'x-frame-options') || null;
  const contentSecurityPolicy =
    collectHeader(headers, 'content-security-policy') || null;
  const ancestors = parseFrameAncestors(contentSecurityPolicy);

  if (ancestors) {
    if (ancestors.includes("'none'")) {
      return {
        embeddable: false,
        reason: "CSP frame-ancestors 'none'",
        xFrameOptions,
        contentSecurityPolicy,
      };
    }
    if (ancestors.length === 1 && ancestors[0] === '*') {
      return {
        embeddable: true,
        reason: 'CSP frame-ancestors allows any origin',
        xFrameOptions,
        contentSecurityPolicy,
      };
    }
    return {
      embeddable: false,
      reason: `CSP frame-ancestors ${ancestors.join(' ')}`,
      xFrameOptions,
      contentSecurityPolicy,
    };
  }

  const xfo = xFrameOptions?.trim().toUpperCase() ?? '';
  if (xfo === 'DENY' || xfo.startsWith('SAMEORIGIN') || xfo.startsWith('ALLOW-FROM')) {
    return {
      embeddable: false,
      reason: `X-Frame-Options: ${xFrameOptions}`,
      xFrameOptions,
      contentSecurityPolicy,
    };
  }

  return {
    embeddable: true,
    reason: 'No X-Frame-Options or CSP frame-ancestors header',
    xFrameOptions,
    contentSecurityPolicy,
  };
}

async function fetchHeaders(url: string) {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  const request: RequestInit = {
    redirect: 'follow',
    headers: { 'user-agent': 'ZamViewer-EmbedCheck/1.0' },
    signal,
  };

  let response = await fetch(url, { ...request, method: 'HEAD' });
  if (response.status === 405 || response.status === 501) {
    response = await fetch(url, { ...request, method: 'GET' });
  }
  return response;
}

export async function inspectEmbedPolicy(value: string): Promise<EmbedCheckResult> {
  const url = assertPublicHttpsUrl(value);
  const response = await fetchHeaders(url.toString());
  const finalUrl = assertPublicHttpsUrl(response.url || url.toString());
  const policy = policyFromHeaders(response.headers);

  return {
    url: finalUrl.toString().replace(/\/$/, ''),
    checkedAt: new Date().toISOString(),
    ...policy,
  };
}
