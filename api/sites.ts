import { sitesHandler } from '../src/lib/server/sites-handler';

export function GET(request: Request) {
  return sitesHandler(request);
}

export function POST(request: Request) {
  return sitesHandler(request);
}

export function PUT(request: Request) {
  return sitesHandler(request);
}

export function DELETE(request: Request) {
  return sitesHandler(request);
}
