import type { Route } from './+types/about';
import { getSeoMeta } from '../seo-meta';

export { SlgPage as default } from '../pages/static-pages';

export const meta: Route.MetaFunction = () => getSeoMeta('/about-us');
