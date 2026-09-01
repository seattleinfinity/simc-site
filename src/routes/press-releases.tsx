import type { Route } from './+types/press-releases';
import { getSeoMeta } from '../seo-meta';

export { PressReleasesPage as default } from '../pages/archive-pages';

export const meta: Route.MetaFunction = () => getSeoMeta('/press-releases');
