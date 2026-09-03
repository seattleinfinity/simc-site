import { redirectLegacyRequest } from '../route-redirect';
import type { Route } from './+types/not-found';
import { getSeoMeta } from '../seo-meta';
import { getRedirectTarget } from '../redirects';

export { NotFoundPage as default } from '../pages/static-pages';

export function loader({ request }: Route.LoaderArgs) {
  return redirectLegacyRequest(request);
}

export const meta: Route.MetaFunction = ({ location }) => (
  getRedirectTarget(location.pathname) ? getSeoMeta('/404') : getSeoMeta(location.pathname)
);
