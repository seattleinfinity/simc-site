import type { Route } from './+types/home';
import { getSeoMeta } from '../seo-meta';

export { HomePage as default } from '../pages/home-page';

export const meta: Route.MetaFunction = () => getSeoMeta('/');
