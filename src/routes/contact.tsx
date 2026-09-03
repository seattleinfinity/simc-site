import type { Route } from './+types/contact';
import { getSeoMeta } from '../seo-meta';

export { ContactPage as default } from '../pages/static-pages';

export const meta: Route.MetaFunction = () => getSeoMeta('/contact');
