import type { Route } from './+types/event-detail';
import { getSeoMeta } from '../seo-meta';

export { EventDetailPage as default } from '../pages/detail-pages';

export const meta: Route.MetaFunction = ({ params }) => getSeoMeta(`/events/${params.slug ?? ''}`);
