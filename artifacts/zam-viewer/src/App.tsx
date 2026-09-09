import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import initialSites from './data/sites.json';
import {
  Route,
  Switch,
  useLocation,
  useRoute,
  Router as WouterRouter,
} from 'wouter';

const ADMIN_PIN = '1234';
const DRAFT_STORAGE_KEY = 'zam-viewer-sites-draft-v1';

type Site = {
  slug: string;
  name: string;
  url: string;
  description: string;
  published: boolean;
  isDefault?: boolean;
};

const INITIAL_SITES = initialSites as Site[];

function cloneInitialSites() {
  return INITIAL_SITES.map((site) => ({ ...site }));
}

function readSites() {
  if (typeof window === 'undefined') {
    return cloneInitialSites();
  }

  try {
    const stored = window.localStorage.getItem(DRAFT_STORAGE_KEY);
    if (!stored) {
      return cloneInitialSites();
    }

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? (parsed as Site[]) : cloneInitialSites();
  } catch {
    return cloneInitialSites();
  }
}

function getDefaultSite(sites: Site[]) {
  return (
    sites.find((site) => site.published && site.isDefault) ??
    sites.find((site) => site.published) ??
    sites[0]
  );
}

function normalizeSiteUrl(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:') {
    throw new Error('Use an HTTPS URL.');
  }
  return url.toString().replace(/\/$/, '');
}

function Viewer({ site }: { site?: Site }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setIsLoaded(false);
    setHasFailed(false);
  }, [site?.url]);

  useEffect(() => {
    if (isLoaded || !site) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHasFailed(true);
    }, 15000);

    return () => window.clearTimeout(timeoutId);
  }, [isLoaded, site]);

  if (!site) {
    return (
      <main className="viewer viewer--fallback">
        <div className="viewer__fallback">
          <div className="viewer__fallback-inner">
            <p className="viewer__fallback-message">
              No published pages are available yet.
            </p>
            <a className="viewer__fallback-link" href="/admin">
              Open admin
            </a>
          </div>
        </div>
      </main>
    );
  }

  if (hasFailed) {
    return (
      <main className="viewer viewer--fallback" data-testid="viewer-fallback">
        <div className="viewer__fallback">
          <div className="viewer__fallback-inner">
            <p className="viewer__fallback-message">
              This page could not be loaded inside the viewer.
            </p>
            <a
              className="viewer__fallback-link"
              data-testid="link-source-page"
              href={site.url}
              target="_blank"
              rel="noreferrer"
            >
              Open the original page
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main
      className="viewer"
      data-testid="zam-viewer"
      aria-busy={!isLoaded}
    >
      <iframe
        className="viewer__frame"
        data-testid="iframe-source-page"
        src={site.url}
        title={site.name}
        allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasFailed(true)}
      />
      <div
        className={`viewer__veil${isLoaded ? ' viewer__veil--hidden' : ''}`}
        data-testid="loading-state"
        role="status"
        aria-label="Loading"
      >
        <span className="viewer__pulse" aria-hidden="true" />
      </div>
    </main>
  );
}

function PublicSite({ slug }: { slug?: string }) {
  const [sites, setSites] = useState<Site[]>(readSites);
  const site = useMemo(() => {
    if (slug) {
      return sites.find((candidate) => candidate.slug === slug && candidate.published);
    }
    return getDefaultSite(sites);
  }, [sites, slug]);

  useEffect(() => {
    const refresh = () => setSites(readSites());
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  return <Viewer site={site} />;
}

function AdminLogin({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pin === ADMIN_PIN) {
      window.sessionStorage.setItem('zam-viewer-admin-unlocked', 'true');
      onUnlock();
      return;
    }
    setError('That PIN is not correct.');
    setPin('');
  }

  return (
    <main className="admin-shell admin-shell--login">
      <section className="admin-login-card">
        <div className="admin-eyebrow">Zam Viewer</div>
        <h1>Page manager</h1>
        <p className="admin-muted">
          Enter the admin PIN to manage the pages included in the next
          deployment.
        </p>
        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label htmlFor="admin-pin">Admin PIN</label>
          <input
            id="admin-pin"
            inputMode="numeric"
            autoComplete="off"
            maxLength={4}
            type="password"
            value={pin}
            onChange={(event) => {
              setPin(event.target.value.replace(/\D/g, ''));
              setError('');
            }}
            placeholder="••••"
          />
          {error ? <p className="admin-error">{error}</p> : null}
          <button className="admin-button admin-button--primary" type="submit">
            Unlock admin
          </button>
        </form>
        <p className="admin-warning">
          This is a convenience PIN, not strong security. Anyone who can
          inspect the published app can discover it.
        </p>
      </section>
    </main>
  );
}

function Admin() {
  const [, navigate] = useLocation();
  const [unlocked, setUnlocked] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.sessionStorage.getItem('zam-viewer-admin-unlocked') === 'true',
  );
  const [sites, setSites] = useState<Site[]>(readSites);
  const [editingSlug, setEditingSlug] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    slug: '',
    url: '',
    description: '',
    published: true,
  });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const editingSite = sites.find((site) => site.slug === editingSlug);

  function updateSites(nextSites: Site[], nextNotice = '') {
    setSites(nextSites);
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(nextSites, null, 2));
    setNotice(nextNotice);
    setError('');
  }

  function resetForm() {
    setEditingSlug(null);
    setForm({
      name: '',
      slug: '',
      url: '',
      description: '',
      published: true,
    });
  }

  function startEditing(site: Site) {
    setEditingSlug(site.slug);
    setForm({
      name: site.name,
      slug: site.slug,
      url: site.url,
      description: site.description,
      published: site.published,
    });
    setNotice('');
    setError('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleSiteSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    const slug = form.slug.trim().toLowerCase();
    const name = form.name.trim();

    if (!name || !slug || !form.url.trim()) {
      setError('Name, slug, and URL are required.');
      return;
    }

    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      setError('Use lowercase letters, numbers, and hyphens for the slug.');
      return;
    }

    let url: string;
    try {
      url = normalizeSiteUrl(form.url);
    } catch {
      setError('Enter a valid HTTPS URL.');
      return;
    }

    if (sites.some((site) => site.slug === slug && site.slug !== editingSlug)) {
      setError('That slug is already in use.');
      return;
    }

    const nextSite: Site = {
      slug,
      name,
      url,
      description: form.description.trim(),
      published: form.published,
      isDefault: editingSite?.isDefault ?? sites.length === 0,
    };

    const nextSites = editingSlug
      ? sites.map((site) => (site.slug === editingSlug ? nextSite : site))
      : [...sites, nextSite];

    updateSites(nextSites, editingSlug ? 'Page updated in local draft.' : 'Page added to local draft.');
    resetForm();
  }

  function togglePublished(site: Site) {
    const nextSites = sites.map((candidate) =>
      candidate.slug === site.slug
        ? { ...candidate, published: !candidate.published }
        : candidate,
    );
    updateSites(nextSites, `${site.name} is now ${site.published ? 'unpublished' : 'published'}.`);
  }

  function setDefault(site: Site) {
    const nextSites = sites.map((candidate) => ({
      ...candidate,
      isDefault: candidate.slug === site.slug,
    }));
    updateSites(nextSites, `${site.name} is now the default page.`);
  }

  function removeSite(site: Site) {
    if (!window.confirm(`Remove ${site.name} from the page list?`)) {
      return;
    }

    const remaining = sites.filter((candidate) => candidate.slug !== site.slug);
    if (site.isDefault && remaining[0]) {
      remaining[0] = { ...remaining[0], isDefault: true };
    }
    updateSites(remaining, `${site.name} was removed from the local draft.`);
    if (editingSlug === site.slug) {
      resetForm();
    }
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify(sites, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'sites.json';
    link.click();
    URL.revokeObjectURL(url);
    setNotice('Downloaded sites.json. Replace the project file and redeploy.');
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) {
          throw new Error('The JSON must contain an array.');
        }
        updateSites(parsed as Site[], 'Imported a local sites.json draft.');
      } catch {
        setError('That file is not a valid sites.json array.');
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  }

  if (!unlocked) {
    return <AdminLogin onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <div className="admin-eyebrow">Zam Viewer</div>
          <h1>Page manager</h1>
        </div>
        <button
          className="admin-button admin-button--quiet"
          type="button"
          onClick={() => {
            window.sessionStorage.removeItem('zam-viewer-admin-unlocked');
            setUnlocked(false);
          }}
        >
          Lock
        </button>
      </header>

      <section className="admin-notice">
        <strong>Local JSON workflow</strong>
        <p>
          Changes are saved in this browser as a draft. Download the JSON,
          replace <code>src/data/sites.json</code>, then redeploy on Vercel.
        </p>
      </section>

      {notice ? <div className="admin-feedback">{notice}</div> : null}
      {error ? <div className="admin-feedback admin-feedback--error">{error}</div> : null}

      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <div className="admin-eyebrow">{editingSlug ? 'Edit page' : 'Add page'}</div>
            <h2>{editingSlug ? editingSite?.name : 'New embedded page'}</h2>
          </div>
          {editingSlug ? (
            <button className="admin-text-button" type="button" onClick={resetForm}>
              Cancel
            </button>
          ) : null}
        </div>
        <form className="admin-form" onSubmit={handleSiteSubmit}>
          <label>
            Page name
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              placeholder="Zam"
            />
          </label>
          <label>
            Public slug
            <input
              value={form.slug}
              onChange={(event) => setForm({ ...form, slug: event.target.value })}
              placeholder="zam"
            />
            <span className="admin-field-help">Public URL: /view/your-slug</span>
          </label>
          <label>
            Source URL
            <input
              type="url"
              value={form.url}
              onChange={(event) => setForm({ ...form, url: event.target.value })}
              placeholder="https://example.com/page"
            />
          </label>
          <label>
            Short description
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              placeholder="Optional note for the page list."
            />
          </label>
          <label className="admin-checkbox">
            <input
              type="checkbox"
              checked={form.published}
              onChange={(event) => setForm({ ...form, published: event.target.checked })}
            />
            Published and visible to visitors
          </label>
          <button className="admin-button admin-button--primary" type="submit">
            {editingSlug ? 'Save page draft' : 'Add page'}
          </button>
        </form>
      </section>

      <section className="admin-card">
        <div className="admin-card-heading">
          <div>
            <div className="admin-eyebrow">Pages</div>
            <h2>{sites.length} configured</h2>
          </div>
          <span className="admin-count">{sites.filter((site) => site.published).length} live</span>
        </div>
        <div className="admin-list">
          {sites.length ? (
            sites.map((site) => (
              <article className="admin-site" key={site.slug}>
                <div className="admin-site-topline">
                  <div>
                    <h3>{site.name}</h3>
                    <p className="admin-site-url">/view/{site.slug}</p>
                  </div>
                  <span className={`admin-status${site.published ? ' admin-status--live' : ''}`}>
                    {site.published ? 'Live' : 'Hidden'}
                  </span>
                </div>
                <p className="admin-site-description">{site.description || site.url}</p>
                <div className="admin-site-actions">
                  <button className="admin-text-button" type="button" onClick={() => startEditing(site)}>
                    Edit
                  </button>
                  <button className="admin-text-button" type="button" onClick={() => togglePublished(site)}>
                    {site.published ? 'Unpublish' : 'Publish'}
                  </button>
                  <button className="admin-text-button" type="button" onClick={() => setDefault(site)}>
                    {site.isDefault ? 'Default' : 'Make default'}
                  </button>
                  <button className="admin-text-button admin-text-button--danger" type="button" onClick={() => removeSite(site)}>
                    Delete
                  </button>
                </div>
              </article>
            ))
          ) : (
            <p className="admin-muted">No pages yet. Add your first page above.</p>
          )}
        </div>
      </section>

      <section className="admin-card admin-card--tools">
        <div className="admin-card-heading">
          <div>
            <div className="admin-eyebrow">Deployment file</div>
            <h2>Move your draft to Vercel</h2>
          </div>
        </div>
        <p className="admin-muted">
          Export the updated list, replace the project JSON file, and deploy
          again. Import is useful when you move between browsers.
        </p>
        <div className="admin-tool-actions">
          <button className="admin-button admin-button--primary" type="button" onClick={downloadJson}>
            Download sites.json
          </button>
          <label className="admin-button admin-button--quiet admin-file-button">
            Import sites.json
            <input type="file" accept="application/json,.json" onChange={importJson} />
          </label>
          <button className="admin-button admin-button--quiet" type="button" onClick={() => navigate('/')}>
            View default page
          </button>
        </div>
      </section>
    </main>
  );
}

function MissingPage() {
  return (
    <main className="viewer viewer--fallback">
      <div className="viewer__fallback">
        <div className="viewer__fallback-inner">
          <p className="viewer__fallback-message">That page is not available.</p>
          <a className="viewer__fallback-link" href="/">
            Open the default page
          </a>
        </div>
      </div>
    </main>
  );
}

function ViewRoute() {
  const [matches, params] = useRoute('/view/:slug');
  return matches ? <PublicSite slug={params.slug} /> : <MissingPage />;
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={() => <PublicSite />} />
        <Route path="/admin" component={Admin} />
        <Route path="/view/:slug" component={ViewRoute} />
        <Route component={MissingPage} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Router />
    </WouterRouter>
  );
}

export default App;