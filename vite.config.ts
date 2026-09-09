import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { analyticsHandler } from './api/_lib/analytics-handler';
import { canEmbedHandler } from './api/_lib/can-embed-handler';
import { sitesHandler } from './api/_lib/sites-handler';

function readBody(req: IncomingMessage) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return Promise.resolve(undefined);
  }

  return new Promise<string | undefined>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk as Buffer));
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8') || undefined);
    });
    req.on('error', reject);
  });
}

function apiPlugin(): Plugin {
  async function handle(req: IncomingMessage, res: ServerResponse) {
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        value.forEach((item) => headers.append(key, item));
      } else if (value) {
        headers.set(key, value);
      }
    }

    const body = await readBody(req);
    const request = new Request(`http://127.0.0.1${req.url ?? '/'}`, {
      method: req.method,
      headers,
      body,
      ...(body ? { duplex: 'half' } : {}),
    } as RequestInit);

    const pathname = new URL(request.url).pathname;
    const response =
      pathname === '/api/sites'
        ? await sitesHandler(request)
        : pathname === '/api/can-embed'
          ? await canEmbedHandler(request)
          : pathname === '/api/analytics'
            ? await analyticsHandler(request)
            : new Response(JSON.stringify({ error: 'Not found.' }), { status: 404 });

    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.end(await response.text());
  }

  return {
    name: 'neon-api',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          next();
          return;
        }
        void handle(req, res).catch(next);
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/')) {
          next();
          return;
        }
        void handle(req, res).catch(next);
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  if (env.DATABASE_URL) {
    process.env.DATABASE_URL = env.DATABASE_URL;
  }
  if (env.ADMIN_PIN) {
    process.env.ADMIN_PIN = env.ADMIN_PIN;
  }
  if (env.POSTHOG_PERSONAL_API_KEY) {
    process.env.POSTHOG_PERSONAL_API_KEY = env.POSTHOG_PERSONAL_API_KEY;
  }
  if (env.POSTHOG_PROJECT_ID) {
    process.env.POSTHOG_PROJECT_ID = env.POSTHOG_PROJECT_ID;
  }
  if (env.POSTHOG_HOST) {
    process.env.POSTHOG_HOST = env.POSTHOG_HOST;
  }

  return {
    plugins: [react(), tailwindcss(), apiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(import.meta.dirname, 'src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
    },
  };
});
