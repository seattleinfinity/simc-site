import type { Route } from './+types/calendar';
import { getSeoMeta } from '../seo-meta';

export { CalendarPage as default } from '../pages/static-pages';

export const meta: Route.MetaFunction = () => getSeoMeta('/calendar');
