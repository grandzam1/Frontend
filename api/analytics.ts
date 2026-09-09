import type { IncomingMessage, ServerResponse } from 'node:http';
import { analyticsHandler } from './_lib/analytics-handler.js';

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.statusCode = 405;
      res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed.' }));
      return;
    }

    const host = req.headers.host || 'localhost';
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        value.forEach((item) => headers.append(key, item));
      } else if (value) {
        headers.set(key, value);
      }
    }

    const request = new Request(`https://${host}${req.url || '/'}`, {
      method: req.method,
      headers,
    });

    const response = await analyticsHandler(request);
    res.statusCode = response.status;
    response.headers.forEach((value, key) => {
      res.setHeader(key, value);
    });
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Function error.';
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: message }));
  }
}
