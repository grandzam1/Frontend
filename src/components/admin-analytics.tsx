import { useEffect, useState } from 'react';
import {
  fetchAnalyticsDashboard,
  type AnalyticsDashboard,
} from '@/lib/analytics-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

function cellValue(value: unknown) {
  if (value == null) {
    return '—';
  }
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  return String(value);
}

function maxCount(rows: unknown[][], index: number) {
  let max = 0;
  for (const row of rows) {
    const value = Number(row[index]);
    if (Number.isFinite(value) && value > max) {
      max = value;
    }
  }
  return max || 1;
}

export function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    setError('');
    try {
      setData(await fetchAnalyticsDashboard());
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Could not load analytics.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const pageviewMax = data
    ? maxCount(data.pageviewsByDay.results, 1)
    : 1;

  return (
    <Card>
      <CardHeader>
        <CardDescription>PostHog</CardDescription>
        <CardTitle>Traffic snapshot</CardTitle>
        <CardAction>
          <Button type="button" variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            {loading ? 'Loading…' : 'Refresh'}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="admin-analytics">
        <p className="admin-muted">
          Queried from PostHog with your personal API key on the server. The key
          never ships to the browser.
        </p>

        {error ? (
          <Alert variant="destructive">
            <AlertTitle>Analytics unavailable</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {loading && !data ? (
          <p className="admin-muted">Loading PostHog queries…</p>
        ) : null}

        {data ? (
          <>
            <p className="admin-field-help">
              Updated {new Date(data.generatedAt).toLocaleString()}
            </p>

            <section className="admin-analytics-section">
              <h2 className="admin-analytics-heading">Pageviews (14 days)</h2>
              {data.pageviewsByDay.results.length === 0 ? (
                <p className="admin-muted">No pageviews in this window yet.</p>
              ) : (
                <ul className="admin-analytics-bars">
                  {data.pageviewsByDay.results.map((row) => {
                    const day = cellValue(row[0]);
                    const count = Number(row[1]) || 0;
                    const width = Math.max(4, Math.round((count / pageviewMax) * 100));
                    return (
                      <li key={day} className="admin-analytics-bar-row">
                        <span className="admin-analytics-bar-label">{day}</span>
                        <span className="admin-analytics-bar-track">
                          <span
                            className="admin-analytics-bar-fill"
                            style={{ width: `${width}%` }}
                          />
                        </span>
                        <span className="admin-analytics-bar-value">
                          {count.toLocaleString()}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="admin-analytics-section">
              <h2 className="admin-analytics-heading">Top events (7 days)</h2>
              {data.topEvents.results.length === 0 ? (
                <p className="admin-muted">No events in this window yet.</p>
              ) : (
                <div className="admin-analytics-table-wrap">
                  <table className="admin-analytics-table">
                    <thead>
                      <tr>
                        {data.topEvents.columns.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {data.topEvents.results.map((row, index) => (
                        <tr key={`${cellValue(row[0])}-${index}`}>
                          {row.map((cell, cellIndex) => (
                            <td key={`${index}-${cellIndex}`}>{cellValue(cell)}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
