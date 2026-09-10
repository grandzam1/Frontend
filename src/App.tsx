import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from 'react';
import { AdminAnalytics } from '@/components/admin-analytics';
import { SpaceXHqHome } from '@/components/spacex-hq-home';
import { ErrorBoundary } from '@/components/error-boundary';
import { canEmbed, type EmbedCheckResult } from '@/lib/can-embed';
import { getPublishedDefaultSite, type Site } from '@/lib/site';
import {
  clearAdminPin,
  fetchAllSites,
  fetchPublishedSites,
  persistSites,
  unlockAdmin,
} from '@/lib/sites-api';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ExternalLink, LayoutList } from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  useRoute,
  Router as WouterRouter,
} from 'wouter';

function normalizeSiteUrl(value: string) {
  const url = new URL(value.trim());
  if (url.protocol !== 'https:') {
    throw new Error('Use an HTTPS URL.');
  }
  return url.toString().replace(/\/$/, '');
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function suggestFromUrl(value: string) {
  try {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') {
      return null;
    }

    const lastSegment = url.pathname
      .split('/')
      .filter(Boolean)
      .at(-1)
      ?.replace(/\.[a-z0-9]{2,4}$/i, '');
    const hostLabel = url.hostname.replace(/^www\./, '').split('.')[0] ?? '';
    const name = titleCase(decodeURIComponent(lastSegment || hostLabel));
    const slug = slugify(name);

    if (!name || !slug) {
      return null;
    }

    return { name, slug };
  } catch {
    return null;
  }
}

function previewHref(value: string) {
  try {
    return normalizeSiteUrl(value);
  } catch {
    return null;
  }
}

function ViewerFallback({
  site,
  message,
}: {
  site?: Site;
  message: string;
}) {
  return (
    <main className="viewer-root viewer--fallback" data-testid="viewer-fallback">
      <div className="viewer__fallback">
        <div className="viewer__fallback-inner">
          <p className="viewer__fallback-message">{message}</p>
          {site ? (
            <a
              className="viewer__fallback-link"
              data-testid="link-source-page"
              href={site.url}
              target="_blank"
              rel="noreferrer"
            >
              Open the original page
            </a>
          ) : (
            <a className="viewer__fallback-link" href="/admin">
              Open admin
            </a>
          )}
        </div>
      </div>
    </main>
  );
}

function Viewer({ site }: { site?: Site }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);
  const [embeddable, setEmbeddable] = useState<boolean | null>(() =>
    typeof site?.embeddable === 'boolean' ? site.embeddable : null,
  );

  useEffect(() => {
    setIsLoaded(false);
    setHasFailed(false);
    setEmbeddable(typeof site?.embeddable === 'boolean' ? site.embeddable : null);
  }, [site?.url, site?.embeddable]);

  useEffect(() => {
    if (!site) {
      return;
    }

    let cancelled = false;
    canEmbed(site.url)
      .then((result) => {
        if (!cancelled) {
          setEmbeddable(result.embeddable);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEmbeddable((current) => current ?? true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [site?.url]);

  useEffect(() => {
    if (isLoaded || !site || embeddable === false) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHasFailed(true);
    }, 15000);

    return () => window.clearTimeout(timeoutId);
  }, [isLoaded, site, embeddable]);

  if (!site) {
    return (
      <ViewerFallback message="No published pages are available yet." />
    );
  }

  if (embeddable === false || hasFailed) {
    return (
      <ViewerFallback
        site={site}
        message="This page could not be loaded inside the viewer."
      />
    );
  }

  if (embeddable !== true) {
    return (
      <main className="viewer-root" data-testid="zam-viewer" aria-busy="true">
        <div className="viewer__veil" data-testid="loading-state" role="status" aria-label="Loading">
          <span className="viewer__pulse" aria-hidden="true" />
        </div>
      </main>
    );
  }

  return (
    <main
      className="viewer-root"
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
  const [sites, setSites] = useState<Site[]>([]);
  const [ready, setReady] = useState(false);
  const site = useMemo(() => {
    if (!ready) {
      return undefined;
    }
    if (slug) {
      return sites.find(
        (candidate) => candidate.slug === slug && candidate.published,
      );
    }
    return getPublishedDefaultSite(sites);
  }, [sites, slug, ready]);

  useEffect(() => {
    let cancelled = false;
    fetchPublishedSites()
      .then((nextSites) => {
        if (!cancelled) {
          setSites(nextSites);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSites([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) {
    return (
      <main className="viewer-root" aria-busy="true">
        <div className="viewer__veil" role="status" aria-label="Loading">
          <span className="viewer__pulse" aria-hidden="true" />
        </div>
      </main>
    );
  }

  if (!slug && !site) {
    return <SpaceXHqHome />;
  }

  return <Viewer site={site} />;
}

function AdminLogin({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await unlockAdmin(pin);
    if (result.ok) {
      onUnlock();
      return;
    }
    setError(result.message);
    setPin('');
  }

  return (
    <main className="admin-login">
      <Card className="admin-login-card">
        <CardHeader>
          <CardDescription>Zam Viewer</CardDescription>
          <CardTitle className="admin-login-title">Page manager</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="admin-login-copy">
            Enter the admin PIN to manage pages stored in Neon.
          </p>
          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="admin-field">
              <Label htmlFor="admin-pin">Admin PIN</Label>
              <Input
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
            </div>
            {error ? (
              <Alert variant="destructive">
                <AlertTitle>Could not unlock</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <Button type="submit">Unlock admin</Button>
          </form>
        </CardContent>
        <CardFooter>
          <p className="admin-login-warning">
            This is a convenience PIN, not strong security. Anyone who can
            inspect the published app can discover it.
          </p>
        </CardFooter>
      </Card>
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
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
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
  const [embedCheck, setEmbedCheck] = useState<EmbedCheckResult | null>(null);
  const [embedChecking, setEmbedChecking] = useState(false);
  const [adminTab, setAdminTab] = useState<'pages' | 'analytics'>('pages');
  const importInputRef = useRef<HTMLInputElement>(null);
  const lastSuggestedNameRef = useRef('');

  const editingSite = sites.find((site) => site.slug === editingSlug);
  const sourcePreview = previewHref(form.url);
  const publicSlug = slugify(form.slug);
  const urlSuggestion = suggestFromUrl(form.url);
  const nameSuggestions = [...new Set(sites.map((site) => site.name))];
  const urlSuggestions = [...new Set(sites.map((site) => site.url))];

  function applyUrlToForm(
    url: string,
    { overwrite }: { overwrite: boolean },
  ) {
    const suggestion = suggestFromUrl(url);

    setForm((current) => {
      const next = { ...current, url };
      if (!suggestion) {
        return next;
      }

      const nameWasSuggested =
        overwrite ||
        !current.name.trim() ||
        current.name === lastSuggestedNameRef.current;
      const slugWasSuggested =
        !editingSlug &&
        (overwrite ||
          !current.slug.trim() ||
          current.slug === slugify(current.name));

      if (nameWasSuggested) {
        next.name = suggestion.name;
        lastSuggestedNameRef.current = suggestion.name;
      }
      if (slugWasSuggested) {
        next.slug = suggestion.slug;
      }

      return next;
    });
    setError('');
  }

  useEffect(() => {
    if (!sourcePreview) {
      setEmbedCheck(null);
      setEmbedChecking(false);
      return;
    }

    let cancelled = false;
    setEmbedChecking(true);
    const timeoutId = window.setTimeout(() => {
      canEmbed(sourcePreview)
        .then((result) => {
          if (!cancelled) {
            setEmbedCheck(result);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setEmbedCheck(null);
          }
        })
        .finally(() => {
          if (!cancelled) {
            setEmbedChecking(false);
          }
        });
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [sourcePreview]);

  useEffect(() => {
    if (!unlocked) {
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchAllSites()
      .then((nextSites) => {
        if (!cancelled) {
          setSites(nextSites);
          setError('');
        }
      })
      .catch((loadError) => {
        if (cancelled) {
          return;
        }
        const message =
          loadError instanceof Error ? loadError.message : 'Could not load pages.';
        setError(message);
        if (/admin pin|401|unauthorized/i.test(message)) {
          clearAdminPin();
          setUnlocked(false);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [unlocked]);

  async function updateSites(nextSites: Site[], nextNotice = '') {
    setSaving(true);
    try {
      const saved = await persistSites(nextSites);
      setSites(saved);
      setNotice(nextNotice);
      setError('');
      return true;
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save pages.');
      return false;
    } finally {
      setSaving(false);
    }
  }

  function resetForm() {
    setEditingSlug(null);
    lastSuggestedNameRef.current = '';
    setEmbedCheck(null);
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

  async function handleSiteSubmit(event: FormEvent<HTMLFormElement>) {
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

    let embed: EmbedCheckResult | null = null;
    try {
      embed = await canEmbed(url);
    } catch {
      embed = null;
    }

    const nextSite: Site = {
      slug,
      name,
      url,
      description: form.description.trim(),
      published: form.published,
      isDefault: editingSite?.isDefault ?? sites.length === 0,
      embeddable: embed?.embeddable,
      embedCheckedAt: embed?.checkedAt,
      embedReason: embed?.reason,
    };

    const nextSites = editingSlug
      ? sites.map((site) => (site.slug === editingSlug ? nextSite : site))
      : [...sites, nextSite];

    const saved = await updateSites(
      nextSites,
      editingSlug ? 'Page updated in Neon.' : 'Page added in Neon.',
    );
    if (saved) {
      resetForm();
    }
  }

  async function togglePublished(site: Site) {
    const nextSites = sites.map((candidate) =>
      candidate.slug === site.slug
        ? { ...candidate, published: !candidate.published }
        : candidate,
    );
    await updateSites(
      nextSites,
      `${site.name} is now ${site.published ? 'unpublished' : 'published'}.`,
    );
  }

  async function setDefault(site: Site) {
    if (site.isDefault) {
      const nextSites = sites.map((candidate) => ({
        ...candidate,
        isDefault: false,
      }));
      await updateSites(
        nextSites,
        'Default cleared. / now shows SpaceX HQ home.',
      );
      return;
    }

    const nextSites = sites.map((candidate) => ({
      ...candidate,
      isDefault: candidate.slug === site.slug,
    }));
    await updateSites(nextSites, `${site.name} is now the default page.`);
  }

  async function removeSite(site: Site) {
    if (!window.confirm(`Remove ${site.name} from the page list?`)) {
      return;
    }

    const remaining = sites.filter((candidate) => candidate.slug !== site.slug);
    const saved = await updateSites(remaining, `${site.name} was removed.`);
    if (saved && editingSlug === site.slug) {
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
    setNotice('Downloaded a backup of the pages stored in Neon.');
  }

  function importJson(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        if (!Array.isArray(parsed)) {
          throw new Error('The JSON must contain an array.');
        }
        await updateSites(parsed as Site[], 'Imported pages into Neon.');
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
          <p className="admin-eyebrow">
            Zam Viewer
          </p>
          <h1 className="admin-title">
            {adminTab === 'pages' ? 'Page manager' : 'Audience'}
          </h1>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            clearAdminPin();
            setUnlocked(false);
            setSites([]);
          }}
        >
          Lock
        </Button>
      </header>

      <div
        className="admin-tabs"
        role="tablist"
        aria-label="Admin sections"
      >
        <button
          type="button"
          role="tab"
          className="admin-tab"
          aria-selected={adminTab === 'pages'}
          onClick={() => setAdminTab('pages')}
        >
          Pages
        </button>
        <button
          type="button"
          role="tab"
          className="admin-tab"
          aria-selected={adminTab === 'analytics'}
          onClick={() => setAdminTab('analytics')}
        >
          Analytics
        </button>
      </div>

      {adminTab === 'analytics' ? <AdminAnalytics /> : null}

      {adminTab === 'pages' ? (
        <>
      <Alert>
        <AlertTitle>Stored in Neon</AlertTitle>
        <AlertDescription>
          Pages, publish state, and iframe checks are saved in Postgres. Visitors
          see the published list immediately — no redeploy.
        </AlertDescription>
      </Alert>

      {notice ? (
        <Alert>
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{notice}</AlertDescription>
        </Alert>
      ) : null}
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Check the form</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardDescription>{editingSlug ? 'Edit page' : 'Add page'}</CardDescription>
          <CardTitle>{editingSlug ? editingSite?.name : 'New embedded page'}</CardTitle>
          {editingSlug ? (
            <CardAction>
              <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                Cancel
              </Button>
            </CardAction>
          ) : null}
        </CardHeader>
        <CardContent>
          <form className="admin-form" onSubmit={handleSiteSubmit}>
            <div className="admin-form-row">
              <div className="admin-field">
                <Label htmlFor="admin-page-name">Page name</Label>
                <Input
                  id="admin-page-name"
                  list="admin-name-suggestions"
                  value={form.name}
                  onChange={(event) => {
                    const name = event.target.value;
                    lastSuggestedNameRef.current = '';
                    setForm((current) => ({
                      ...current,
                      name,
                      slug:
                        editingSlug ||
                        (current.slug && current.slug !== slugify(current.name))
                          ? current.slug
                          : slugify(name),
                    }));
                  }}
                  placeholder="Zam"
                  autoComplete="off"
                />
                <p className="admin-field-help">
                  Shown in the page list. Fills from the source URL if left empty.
                </p>
                <datalist id="admin-name-suggestions">
                  {nameSuggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>
              <div className="admin-field">
                <Label htmlFor="admin-page-slug">Public slug</Label>
                <Input
                  id="admin-page-slug"
                  value={form.slug}
                  onChange={(event) =>
                    setForm({ ...form, slug: event.target.value.toLowerCase() })
                  }
                  placeholder="zam"
                  autoComplete="off"
                />
                <p className="admin-field-help">
                  Public URL: /view/{form.slug.trim() || 'your-slug'}
                </p>
              </div>
            </div>
            <div className="admin-field">
              <div className="admin-field-topline">
                <Label htmlFor="admin-source-url">Source URL</Label>
                <div className="admin-field-actions">
                  {sourcePreview ? (
                    <Button variant="link" size="sm" className="admin-inline-link" asChild>
                      <a href={sourcePreview} target="_blank" rel="noreferrer">
                        Preview site
                        <ExternalLink />
                      </a>
                    </Button>
                  ) : null}
                  <Button
                    variant="link"
                    size="sm"
                    type="button"
                    className="admin-inline-link"
                    disabled={!urlSuggestion}
                    onClick={() => applyUrlToForm(form.url, { overwrite: true })}
                  >
                    Autofill
                  </Button>
                  {embedChecking ? (
                    <Badge variant="outline">Checking embed</Badge>
                  ) : embedCheck ? (
                    <Badge variant={embedCheck.embeddable ? 'secondary' : 'destructive'}>
                      {embedCheck.embeddable ? 'Can embed' : 'Cannot iframe'}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <Input
                id="admin-source-url"
                type="url"
                list="admin-url-suggestions"
                value={form.url}
                onChange={(event) =>
                  applyUrlToForm(event.target.value, { overwrite: false })
                }
                placeholder="https://example.com/page"
                autoComplete="url"
              />
              <datalist id="admin-url-suggestions">
                {urlSuggestions.map((url) => (
                  <option key={url} value={url} />
                ))}
              </datalist>
              <p className="admin-field-help">
                Paste an HTTPS page. Name and slug fill from the last path segment
                when those fields are empty. Use Autofill to replace them.
              </p>
              {embedCheck && !embedCheck.embeddable ? (
                <Alert variant="destructive">
                  <AlertTitle>This URL cannot be iframed</AlertTitle>
                  <AlertDescription>{embedCheck.reason}</AlertDescription>
                </Alert>
              ) : null}
            </div>
            <div className="admin-field">
              <Label htmlFor="admin-page-description">Short description</Label>
              <Textarea
                id="admin-page-description"
                rows={3}
                value={form.description}
                onChange={(event) => setForm({ ...form, description: event.target.value })}
                placeholder="Optional note for the page list."
              />
            </div>
            <div className="admin-form-actions">
              <div className="admin-checkbox-row">
                <Checkbox
                  id="admin-published"
                  checked={form.published}
                  onCheckedChange={(value) =>
                    setForm({ ...form, published: value === true })
                  }
                />
                <Label htmlFor="admin-published" className="admin-checkbox-label">
                  Published and visible to visitors
                </Label>
              </div>
              {publicSlug ? (
                <Button variant="link" size="sm" className="admin-inline-link" asChild>
                  <a href={`/view/${publicSlug}`}>Preview /view/{publicSlug}</a>
                </Button>
              ) : null}
              <Button className="admin-submit" type="submit" disabled={saving}>
                {editingSlug ? 'Save page' : 'Add page'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Pages</CardDescription>
          <CardTitle>{sites.length} configured</CardTitle>
          <CardAction>
            <Badge variant="secondary">
              {sites.filter((site) => site.published).length} live
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent className="admin-list">
          <p className="admin-muted">
            If no page is default, visitors see the SpaceX HQ home page at{' '}
            <span className="admin-code">/</span>.
          </p>
          {loading ? (
            <p className="admin-muted">Loading pages from Neon…</p>
          ) : sites.length ? (
            sites.map((site) => (
              <Card key={site.slug} size="sm">
                <CardHeader>
                  <CardTitle>{site.name}</CardTitle>
                  <CardDescription className="admin-site-slug">
                    /view/{site.slug}
                  </CardDescription>
                  <CardAction>
                    <Badge variant={site.published ? 'default' : 'outline'}>
                      {site.published ? 'Live' : 'Hidden'}
                    </Badge>
                    {site.isDefault ? (
                      <Badge variant="secondary">Default</Badge>
                    ) : null}
                    {site.embeddable === false ? (
                      <Badge variant="destructive">Cannot iframe</Badge>
                    ) : null}
                  </CardAction>
                </CardHeader>
                <CardContent>
                  <p className="admin-muted">
                    {site.description || site.url}
                  </p>
                </CardContent>
                <CardFooter className="admin-site-actions">
                  <Button variant="ghost" size="sm" asChild>
                    <a href={site.url} target="_blank" rel="noreferrer">
                      Preview site
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" asChild>
                    <a href={`/view/${site.slug}`}>Open viewer</a>
                  </Button>
                  <Button variant="ghost" size="sm" type="button" onClick={() => startEditing(site)}>
                    Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => togglePublished(site)}
                  >
                    {site.published ? 'Unpublish' : 'Publish'}
                  </Button>
                  <Button variant="ghost" size="sm" type="button" onClick={() => setDefault(site)}>
                    {site.isDefault ? 'Clear default' : 'Make default'}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    className="admin-delete"
                    onClick={() => removeSite(site)}
                  >
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            ))
          ) : (
            <Empty className="admin-empty">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <LayoutList />
                </EmptyMedia>
                <EmptyTitle>No pages yet</EmptyTitle>
                <EmptyDescription>
                  Add your first page above.
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardDescription>Backup</CardDescription>
          <CardTitle>Export or restore pages</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="admin-muted">
            Download is a JSON backup. Import replaces the Neon page list.
          </p>
        </CardContent>
        <CardFooter className="admin-tools">
          <Button type="button" onClick={downloadJson}>
            Download sites.json
          </Button>
          <Button
            variant="outline"
            type="button"
            onClick={() => importInputRef.current?.click()}
          >
            Import sites.json
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            className="hidden"
            tabIndex={-1}
            onChange={importJson}
          />
          <Button variant="outline" type="button" onClick={() => navigate('/')}>
            View default page
          </Button>
        </CardFooter>
      </Card>
        </>
      ) : null}
    </main>
  );
}

function MissingPage() {
  return (
    <main className="viewer-root viewer--fallback">
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