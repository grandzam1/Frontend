export type AnalyticsTable = {
  columns: string[];
  results: unknown[][];
};

export type AnalyticsSummary = {
  pageviews: number;
  visitors: number;
  countries: number;
};

export type AnalyticsDashboard = {
  generatedAt: string;
  windowDays: number;
  summary: AnalyticsSummary;
  topEvents: AnalyticsTable;
  pageviewsByDay: AnalyticsTable;
  byCountry: AnalyticsTable;
  byDevice: AnalyticsTable;
  byBrowser: AnalyticsTable;
  byCity: AnalyticsTable;
};

function adminHeaders() {
  const pin = window.sessionStorage.getItem('zam-viewer-admin-pin') ?? '';
  return { 'x-admin-pin': pin };
}

export async function fetchAnalyticsDashboard() {
  const response = await fetch('/api/analytics', { headers: adminHeaders() });
  const payload = (await response.json()) as AnalyticsDashboard & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(payload.error || 'Could not load analytics.');
  }

  return payload as AnalyticsDashboard;
}
