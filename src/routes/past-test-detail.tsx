import type { Route } from './+types/past-test-detail';
import { getSeoMeta } from '../seo-meta';

export { PastTestDetailPage as default } from '../pages/detail-pages';

export const meta: Route.MetaFunction = ({ params }) => getSeoMeta(`/past-tests/${params.slug ?? ''}`);
