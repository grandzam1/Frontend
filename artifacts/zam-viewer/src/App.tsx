import { useEffect, useState, type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const SOURCE_URL = 'https://spacex.starstruckinfo.net/zam';

function Home() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    if (isLoaded) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setHasFailed(true);
    }, 15000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [isLoaded]);

  if (hasFailed) {
    return (
      <main className="viewer viewer--fallback" data-testid="viewer-fallback">
        <div className="viewer__fallback">
          <div className="viewer__fallback-inner">
            <a
              className="viewer__fallback-link"
              data-testid="link-source-page"
              href={SOURCE_URL}
              target="_blank"
              rel="noreferrer"
            >
              Open the source page
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
        src={SOURCE_URL}
        title="Zam"
        allow="fullscreen; autoplay; encrypted-media; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={() => {
          setIsLoaded(true);
        }}
        onError={() => {
          setHasFailed(true);
        }}
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

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
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
