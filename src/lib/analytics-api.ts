export type AnalyticsTable = {
  columns: string[];
  results: unknown[][];
};

export type AnalyticsDashboard = {
  generatedAt: string;
  topEvents: AnalyticsTable;
  pageviewsByDay: AnalyticsTable;
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
