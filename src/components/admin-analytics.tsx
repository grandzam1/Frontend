import { useEffect, useMemo, useState } from 'react';
import {
  Eye,
  Globe2,
  Laptop,
  MapPin,
  Monitor,
  RefreshCw,
  Smartphone,
  Tablet,
  Users,
} from 'lucide-react';
import {
  fetchAnalyticsDashboard,
  type AnalyticsDashboard,
} from '@/lib/analytics-api';
import { COUNTRY_MAP_POINTS, countryFlag, countryLabel } from '@/lib/geo';
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
import { useAsyncAction } from '@/hooks/use-async-action';

type AnalyticsTab = 'overview' | 'location' | 'tech';

const ANALYTICS_TABS: Array<{ id: AnalyticsTab; label: string }> = [
  { id: 'overview', label: 'Overview' },
  { id: 'location', label: 'Location' },
  { id: 'tech', label: 'Devices & tech' },
];

function cellText(value: unknown) {
  if (value == null || value === '') {
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

function deviceIcon(device: string) {
  const key = device.toLowerCase();
  if (key.includes('mobile') || key.includes('phone')) {
    return Smartphone;
  }
  if (key.includes('tablet')) {
    return Tablet;
  }
  if (key.includes('desktop') || key.includes('pc')) {
    return Monitor;
  }
  return Laptop;
}

function WorldMap({ rows }: { rows: unknown[][] }) {
  const max = maxCount(rows, 2);
  const points = rows
    .map((row) => {
      const code = String(row[0] ?? '').toUpperCase();
      const spot = COUNTRY_MAP_POINTS[code];
      if (!spot) {
        return null;
      }
      const pageviews = Number(row[2]) || 0;
      const radius = 6 + Math.round((pageviews / max) * 14);
      return { code, ...spot, pageviews, radius };
    })
    .filter(Boolean) as Array<{
    code: string;
    x: number;
    y: number;
    name: string;
    pageviews: number;
    radius: number;
  }>;

  return (
    <div className="admin-analytics-map">
      <svg viewBox="0 0 1000 500" role="img" aria-label="Visitor countries map">
        <defs>
          <linearGradient id="admin-map-sea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.06" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.12" />
          </linearGradient>
        </defs>
        <rect width="1000" height="500" rx="18" fill="url(#admin-map-sea)" />
        <path
          className="admin-analytics-map-land"
          d="M140 120c40-35 95-40 150-20 35 12 60 10 95-15 40-28 95-20 130 10 30 26 70 20 95-5 40-38 105-20 130 25 20 36 55 55 95 45 45-10 85 20 70 65-12 35 5 70 45 80 30 8 45 40 25 65-30 38-95 35-135 10-45-28-95-10-120 30-20 32-70 45-105 20-40-28-95-15-120 25-18 28-60 30-85 5-35-35-90-20-115 15-30 42-95 30-120-10-28-45-10-95 30-125zm520 40c25-20 70-15 85 15 12 24-5 50-30 55-28 6-55-15-55-40 0-12 8-22 20-30zm-430 95c22-18 58-10 65 18 6 24-15 45-40 42-28-4-42-35-25-60z"
        />
        {points.map((point) => (
          <g key={point.code}>
            <circle
              className="admin-analytics-map-halo"
              cx={point.x}
              cy={point.y}
              r={point.radius + 8}
            />
            <circle
              className="admin-analytics-map-dot"
              cx={point.x}
              cy={point.y}
              r={point.radius}
            >
              <title>
                {countryFlag(point.code)} {point.name}:{' '}
                {point.pageviews.toLocaleString()} pageviews
              </title>
            </circle>
            <text
              className="admin-analytics-map-flag"
              x={point.x}
              y={point.y + 5}
              textAnchor="middle"
            >
              {countryFlag(point.code)}
            </text>
          </g>
        ))}
      </svg>
      {points.length === 0 ? (
        <p className="admin-muted admin-analytics-map-empty">
          No mapped countries yet. Flags below still show every location PostHog
          resolved from visitor IP.
        </p>
      ) : null}
    </div>
  );
}

function OverviewPanel({
  data,
  pageviewMax,
}: {
  data: AnalyticsDashboard;
  pageviewMax: number;
}) {
  return (
    <div className="admin-tab-panel">
      <div className="admin-analytics-stats">
        <div className="admin-analytics-stat">
          <Eye className="admin-analytics-stat-icon" aria-hidden />
          <div>
            <p className="admin-analytics-stat-label">Pageviews</p>
            <p className="admin-analytics-stat-value">
              {data.summary.pageviews.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="admin-analytics-stat">
          <Users className="admin-analytics-stat-icon" aria-hidden />
          <div>
            <p className="admin-analytics-stat-label">Visitors</p>
            <p className="admin-analytics-stat-value">
              {data.summary.visitors.toLocaleString()}
            </p>
          </div>
        </div>
        <div className="admin-analytics-stat">
          <Globe2 className="admin-analytics-stat-icon" aria-hidden />
          <div>
            <p className="admin-analytics-stat-label">Countries</p>
            <p className="admin-analytics-stat-value">
              {data.summary.countries.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      <section className="admin-analytics-section">
        <div className="admin-analytics-heading-row">
          <Eye className="admin-analytics-heading-icon" aria-hidden />
          <h2 className="admin-analytics-heading">Pageviews by day</h2>
        </div>
        {data.pageviewsByDay.results.length === 0 ? (
          <p className="admin-muted">No pageviews in this window yet.</p>
        ) : (
          <ul className="admin-analytics-bars">
            {data.pageviewsByDay.results.map((row) => {
              const day = cellText(row[0]);
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
        <h2 className="admin-analytics-heading">Top events</h2>
        {data.topEvents.results.length === 0 ? (
          <p className="admin-muted">No events yet.</p>
        ) : (
          <div className="admin-analytics-table-wrap">
            <table className="admin-analytics-table">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {data.topEvents.results.map((row) => (
                  <tr key={cellText(row[0])}>
                    <td>{cellText(row[0])}</td>
                    <td>{cellText(row[1])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function LocationPanel({
  data,
  countryMax,
}: {
  data: AnalyticsDashboard;
  countryMax: number;
}) {
  return (
    <div className="admin-tab-panel">
      <section className="admin-analytics-section">
        <div className="admin-analytics-heading-row">
          <Globe2 className="admin-analytics-heading-icon" aria-hidden />
          <h2 className="admin-analytics-heading">Where people visit from</h2>
        </div>
        <WorldMap rows={data.byCountry.results} />
        {data.byCountry.results.length === 0 ? (
          <p className="admin-muted">No country data yet.</p>
        ) : (
          <ul className="admin-analytics-country-list">
            {data.byCountry.results.map((row) => {
              const code = String(row[0] ?? '??');
              const name = countryLabel(code, String(row[1] ?? ''));
              const pageviews = Number(row[2]) || 0;
              const visitors = Number(row[3]) || 0;
              const width = Math.max(
                6,
                Math.round((pageviews / countryMax) * 100),
              );
              return (
                <li key={`${code}-${name}`} className="admin-analytics-country-row">
                  <span className="admin-analytics-flag" aria-hidden>
                    {countryFlag(code)}
                  </span>
                  <div className="admin-analytics-country-meta">
                    <div className="admin-analytics-country-topline">
                      <strong>{name}</strong>
                      <span className="admin-analytics-code">{code}</span>
                    </div>
                    <span className="admin-analytics-bar-track">
                      <span
                        className="admin-analytics-bar-fill"
                        style={{ width: `${width}%` }}
                      />
                    </span>
                    <p className="admin-field-help">
                      {pageviews.toLocaleString()} views ·{' '}
                      {visitors.toLocaleString()} visitors
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="admin-analytics-section">
        <div className="admin-analytics-heading-row">
          <MapPin className="admin-analytics-heading-icon" aria-hidden />
          <h2 className="admin-analytics-heading">Top cities</h2>
        </div>
        {data.byCity.results.length === 0 ? (
          <p className="admin-muted">No city data yet.</p>
        ) : (
          <ul className="admin-analytics-city-list">
            {data.byCity.results.map((row, index) => {
              const city = cellText(row[0]);
              const code = String(row[1] ?? '??');
              const pageviews = Number(row[2]) || 0;
              return (
                <li key={`${city}-${code}-${index}`} className="admin-analytics-city-row">
                  <span className="admin-analytics-flag" aria-hidden>
                    {countryFlag(code)}
                  </span>
                  <div>
                    <strong>{city}</strong>
                    <p className="admin-field-help">
                      {countryLabel(code)} · {pageviews.toLocaleString()} views
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function TechPanel({
  data,
  deviceMax,
}: {
  data: AnalyticsDashboard;
  deviceMax: number;
}) {
  return (
    <div className="admin-tab-panel">
      <section className="admin-analytics-section">
        <div className="admin-analytics-heading-row">
          <Monitor className="admin-analytics-heading-icon" aria-hidden />
          <h2 className="admin-analytics-heading">Devices</h2>
        </div>
        {data.byDevice.results.length === 0 ? (
          <p className="admin-muted">No device data yet.</p>
        ) : (
          <ul className="admin-analytics-device-list">
            {data.byDevice.results.map((row) => {
              const device = cellText(row[0]);
              const pageviews = Number(row[1]) || 0;
              const visitors = Number(row[2]) || 0;
              const Icon = deviceIcon(device);
              const width = Math.max(
                8,
                Math.round((pageviews / deviceMax) * 100),
              );
              return (
                <li key={device} className="admin-analytics-device-row">
                  <span className="admin-analytics-device-icon">
                    <Icon aria-hidden />
                  </span>
                  <div className="admin-analytics-device-meta">
                    <div className="admin-analytics-country-topline">
                      <strong>{device}</strong>
                      <span>{pageviews.toLocaleString()}</span>
                    </div>
                    <span className="admin-analytics-bar-track">
                      <span
                        className="admin-analytics-bar-fill"
                        style={{ width: `${width}%` }}
                      />
                    </span>
                    <p className="admin-field-help">
                      {visitors.toLocaleString()} visitors
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="admin-analytics-section">
        <h2 className="admin-analytics-heading">Browsers</h2>
        {data.byBrowser.results.length === 0 ? (
          <p className="admin-muted">No browser data yet.</p>
        ) : (
          <div className="admin-analytics-table-wrap">
            <table className="admin-analytics-table">
              <thead>
                <tr>
                  <th>Browser</th>
                  <th>Views</th>
                </tr>
              </thead>
              <tbody>
                {data.byBrowser.results.map((row) => (
                  <tr key={cellText(row[0])}>
                    <td>{cellText(row[0])}</td>
                    <td>{cellText(row[1])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

export function AdminAnalytics() {
  const [data, setData] = useState<AnalyticsDashboard | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<AnalyticsTab>('overview');
  const { run, isPending } = useAsyncAction();
  const loading = isPending('analytics-load');

  async function load(options?: { toastOnSuccess?: boolean }) {
    setError('');
    const result = await run(
      'analytics-load',
      async () => fetchAnalyticsDashboard(),
      {
        success: options?.toastOnSuccess ? 'Analytics refreshed.' : undefined,
        errorFallback: 'Could not load analytics.',
        errorTitle: 'Analytics unavailable',
      },
    );
    if (result) {
      setData(result);
      return;
    }
    setData(null);
    setError('Could not load analytics.');
  }

  useEffect(() => {
    void load();
  }, []);

  const pageviewMax = useMemo(
    () => (data ? maxCount(data.pageviewsByDay.results, 1) : 1),
    [data],
  );
  const countryMax = useMemo(
    () => (data ? maxCount(data.byCountry.results, 2) : 1),
    [data],
  );
  const deviceMax = useMemo(
    () => (data ? maxCount(data.byDevice.results, 1) : 1),
    [data],
  );

  return (
    <Card>
      <CardHeader>
        <CardDescription>Audience insight</CardDescription>
        <CardTitle>Traffic & location</CardTitle>
        <CardAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            loading={loading}
            onClick={() => void load({ toastOnSuccess: true })}
          >
            {loading ? null : <RefreshCw />}
            {loading ? 'Refreshing' : 'Refresh'}
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="admin-analytics">
        <p className="admin-muted">
          Country and city come from PostHog GeoIP (visitor IP stays on PostHog —
          not shown here). Device and browser come from the client.
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
              Last {data.windowDays} days · updated{' '}
              {new Date(data.generatedAt).toLocaleString()}
            </p>

            <div
              className="admin-tabs admin-analytics-tabs"
              role="tablist"
              aria-label="Analytics sections"
            >
              {ANALYTICS_TABS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  className="admin-tab"
                  aria-selected={tab === item.id}
                  onClick={() => setTab(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div role="tabpanel">
              {tab === 'overview' ? (
                <OverviewPanel data={data} pageviewMax={pageviewMax} />
              ) : null}
              {tab === 'location' ? (
                <LocationPanel data={data} countryMax={countryMax} />
              ) : null}
              {tab === 'tech' ? (
                <TechPanel data={data} deviceMax={deviceMax} />
              ) : null}
            </div>
          </>
        ) : null}
      </CardContent>
    </Card>
  );
}
