import { redirectLegacyRequest } from '../route-redirect';
import type { Route } from './+types/past-test-detail';
import { getSeoMeta } from '../seo-meta';

export { PastTestDetailPage as default } from '../pages/detail-pages';

export function loader({ request }: Route.LoaderArgs) {
  return redirectLegacyRequest(request);
}

export const meta: Route.MetaFunction = ({ params }) => getSeoMeta(`/past-tests/${params.slug ?? ''}`);
