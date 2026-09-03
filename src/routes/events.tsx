import type { Route } from './+types/events';
import { getSeoMeta } from '../seo-meta';

export { EventsPage as default } from '../pages/archive-pages';

export const meta: Route.MetaFunction = () => getSeoMeta('/events');
