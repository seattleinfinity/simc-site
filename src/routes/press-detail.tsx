import type { Route } from './+types/press-detail';
import { getSeoMeta } from '../seo-meta';

export { PressDetailPage as default } from '../pages/detail-pages';

export const meta: Route.MetaFunction = ({ params }) => getSeoMeta(`/press-releases/${params.slug ?? ''}`);
