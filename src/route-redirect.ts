import { redirect } from 'react-router';
import { getRedirectTarget } from './redirects';

export function redirectLegacyRequest(request: Request): Response | null {
  const url = new URL(request.url);
  const destination = getRedirectTarget(url.pathname);
  if (!destination) return null;

  return redirect(`${destination}${url.search}`, { status: 301 });
}
