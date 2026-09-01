import type { Route } from './+types/not-found';
import { getSeoMeta } from '../seo-meta';

export { NotFoundPage as default } from '../pages/static-pages';

export const meta: Route.MetaFunction = ({ location }) => getSeoMeta(location.pathname);
