import type { Site } from '@/lib/site';

export function SpaceXHqHome({ sites }: { sites: Site[] }) {
  const published = sites.filter((site) => site.published);

  return (
    <main className="sxhq" data-testid="spacex-hq-home">
      <div className="sxhq__atmosphere" aria-hidden="true" />
      <div className="sxhq__inner">
        <h1 className="sxhq__brand">
          SPACEX
          <span className="sxhq__brand-hq">HQ</span>
        </h1>
        <p className="sxhq__tag">Operations hub · Starstruck</p>
        {published.length > 0 ? (
          <nav className="sxhq__ctas" aria-label="Published pages">
            {published.map((site) => (
              <a key={site.slug} className="sxhq__cta" href={`/view/${site.slug}`}>
                {site.name}
              </a>
            ))}
          </nav>
        ) : null}
      </div>
    </main>
  );
}
