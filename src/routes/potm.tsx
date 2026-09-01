import type { Route } from './+types/potm';
import { getSeoMeta } from '../seo-meta';

export { PotmPage as default } from '../pages/static-pages';

export const meta: Route.MetaFunction = () => getSeoMeta('/potm');
