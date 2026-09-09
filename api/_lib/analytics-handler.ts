import { hasAdminPin } from './db.js';

export type HogQLResult = {
  columns: string[];
  results: unknown[][];
};

function posthogHost() {
  return (
    process.env.POSTHOG_HOST ||
    process.env.VITE_POSTHOG_HOST?.replace('://us.i.', '://us.').replace(
      '://eu.i.',
      '://eu.',
    ) ||
    'https://us.posthog.com'
  ).replace(/\/$/, '');
}

function posthogConfig() {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY?.trim();
  const projectId = process.env.POSTHOG_PROJECT_ID?.trim();
  if (!apiKey || !projectId) {
    throw new Error(
      'PostHog is not configured. Set POSTHOG_PERSONAL_API_KEY and POSTHOG_PROJECT_ID.',
    );
  }
  return { apiKey, projectId, host: posthogHost() };
}

export async function runHogQLQuery(query: string, name: string) {
  const { apiKey, projectId, host } = posthogConfig();
  const response = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      query: {
        kind: 'HogQLQuery',
        query,
        name,
      },
    }),
  });

  const payload = (await response.json()) as HogQLResult & {
    detail?: string;
    error?: string;
  };

  if (!response.ok) {
    throw new Error(
      payload.detail || payload.error || `PostHog query failed (${response.status}).`,
    );
  }

  return {
    columns: payload.columns ?? [],
    results: payload.results ?? [],
  } satisfies HogQLResult;
}

export async function analyticsHandler(request: Request) {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405 });
  }

  if (!hasAdminPin(request)) {
    return Response.json({ error: 'Admin PIN required.' }, { status: 401 });
  }

  try {
    const [topEvents, pageviewsByDay] = await Promise.all([
      runHogQLQuery(
        `SELECT event, count() AS total
         FROM events
         WHERE timestamp > now() - INTERVAL 7 DAY
         GROUP BY event
         ORDER BY total DESC
         LIMIT 15`,
        'admin top events 7d',
      ),
      runHogQLQuery(
        `SELECT toDate(timestamp) AS day, count() AS pageviews
         FROM events
         WHERE event = '$pageview'
           AND timestamp > now() - INTERVAL 14 DAY
         GROUP BY day
         ORDER BY day`,
        'admin pageviews by day 14d',
      ),
    ]);

    return Response.json({
      generatedAt: new Date().toISOString(),
      topEvents,
      pageviewsByDay,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not load analytics.';
    const status = message.includes('not configured') ? 503 : 502;
    return Response.json({ error: message }, { status });
  }
}
