import { canEmbedHandler } from '../src/lib/server/can-embed-handler';

export function GET(request: Request) {
  return canEmbedHandler(request);
}
