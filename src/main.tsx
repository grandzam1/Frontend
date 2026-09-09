import { createRoot } from 'react-dom/client';
import { PostHogProvider } from '@posthog/react';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

const posthogKey = import.meta.env.VITE_POSTHOG_PROJECT_TOKEN;
const posthogHost = import.meta.env.VITE_POSTHOG_HOST;

const app = (
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  posthogKey ? (
    <PostHogProvider
      apiKey={posthogKey}
      options={{
        api_host: posthogHost || 'https://us.i.posthog.com',
        defaults: '2026-05-30',
      }}
    >
      {app}
    </PostHogProvider>
  ) : (
    app
  ),
);
