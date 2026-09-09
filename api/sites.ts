import type { IncomingMessage, ServerResponse } from 'node:http';
import { sitesHandler } from './_lib/sites-handler.js';

async function readBody(req: IncomingMessage) {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return undefined;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  try {
    const host = req.headers.host || 'localhost';
    const headers = new Headers();
    for (const [key, value] of Object.entries(req.headers)) {
      if (Array.isArray(value)) {
        value.forEach((item) => headers.append(key, item));
      } else if (value) {
        headers.set(key, value);
      }
    }

    const body = await readBody(req);
    const request = new Request(`https://${host}${req.url || '/'}`, {
      method: req.method,
      headers,
      body: body && body.length > 0 ? body : undefined,
      // @ts-expect-error Node fetch duplex
      duplex: body && body.length > 0 ? 'half' : undefined,
    });

    const response = await sitesHandler(request);
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
