import type { Route } from './+types/newsletters';
import { getSeoMeta } from '../seo-meta';

export { NewslettersPage as default } from '../pages/static-pages';

export const meta: Route.MetaFunction = () => getSeoMeta('/newsletters');
