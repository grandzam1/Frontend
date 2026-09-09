import { hasAdminPin } from './db.js';

export type HogQLResult = {
  columns: string[];
  results: unknown[][];
};

export type AnalyticsSummary = {
  pageviews: number;
  visitors: number;
  countries: number;
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

function numberCell(row: unknown[] | undefined, index: number) {
  const value = Number(row?.[index]);
  return Number.isFinite(value) ? value : 0;
}

export async function analyticsHandler(request: Request) {
  if (request.method !== 'GET') {
    return Response.json({ error: 'Method not allowed.' }, { status: 405 });
  }

  if (!hasAdminPin(request)) {
    return Response.json({ error: 'Admin PIN required.' }, { status: 401 });
  }

  try {
    const [summaryRows, topEvents, pageviewsByDay, byCountry, byDevice, byBrowser, byCity] =
      await Promise.all([
        runHogQLQuery(
          `SELECT
             countIf(event = '$pageview') AS pageviews,
             count(DISTINCT distinct_id) AS visitors,
             uniq(properties.$geoip_country_code) AS countries
           FROM events
           WHERE timestamp > now() - INTERVAL 14 DAY`,
          'admin summary 14d',
        ),
        runHogQLQuery(
          `SELECT event, count() AS total
           FROM events
           WHERE timestamp > now() - INTERVAL 7 DAY
           GROUP BY event
           ORDER BY total DESC
           LIMIT 12`,
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
        runHogQLQuery(
          `SELECT
             coalesce(nullIf(properties.$geoip_country_code, ''), '??') AS country,
             coalesce(nullIf(properties.$geoip_country_name, ''), 'Unknown') AS country_name,
             count() AS pageviews,
             count(DISTINCT distinct_id) AS visitors
           FROM events
           WHERE event = '$pageview'
             AND timestamp > now() - INTERVAL 14 DAY
           GROUP BY country, country_name
           ORDER BY pageviews DESC
           LIMIT 20`,
          'admin countries 14d',
        ),
        runHogQLQuery(
          `SELECT
             coalesce(nullIf(properties.$device_type, ''), 'Unknown') AS device,
             count() AS pageviews,
             count(DISTINCT distinct_id) AS visitors
           FROM events
           WHERE event = '$pageview'
             AND timestamp > now() - INTERVAL 14 DAY
           GROUP BY device
           ORDER BY pageviews DESC
           LIMIT 10`,
          'admin devices 14d',
        ),
        runHogQLQuery(
          `SELECT
             coalesce(nullIf(properties.$browser, ''), 'Unknown') AS browser,
             count() AS pageviews
           FROM events
           WHERE event = '$pageview'
             AND timestamp > now() - INTERVAL 14 DAY
           GROUP BY browser
           ORDER BY pageviews DESC
           LIMIT 10`,
          'admin browsers 14d',
        ),
        runHogQLQuery(
          `SELECT
             coalesce(nullIf(properties.$geoip_city_name, ''), 'Unknown city') AS city,
             coalesce(nullIf(properties.$geoip_country_code, ''), '??') AS country,
             count() AS pageviews
           FROM events
           WHERE event = '$pageview'
             AND timestamp > now() - INTERVAL 14 DAY
           GROUP BY city, country
           ORDER BY pageviews DESC
           LIMIT 12`,
          'admin cities 14d',
        ),
      ]);

    const summaryRow = summaryRows.results[0];
    const summary: AnalyticsSummary = {
      pageviews: numberCell(summaryRow, 0),
      visitors: numberCell(summaryRow, 1),
      countries: numberCell(summaryRow, 2),
    };

    return Response.json({
      generatedAt: new Date().toISOString(),
      windowDays: 14,
      summary,
      topEvents,
      pageviewsByDay,
      byCountry,
      byDevice,
      byBrowser,
      byCity,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Could not load analytics.';
    const status = message.includes('not configured') ? 503 : 502;
    return Response.json({ error: message }, { status });
  }
}
