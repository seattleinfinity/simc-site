import { redirectLegacyRequest } from '../route-redirect';
import type { Route } from './+types/event-detail';
import { getSeoMeta } from '../seo-meta';

export { EventDetailPage as default } from '../pages/detail-pages';

export function loader({ request }: Route.LoaderArgs) {
  return redirectLegacyRequest(request);
}

export const meta: Route.MetaFunction = ({ params }) => getSeoMeta(`/events/${params.slug ?? ''}`);
