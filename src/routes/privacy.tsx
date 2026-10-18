import type { Route } from './+types/privacy';
import { PrivacyPage } from '../pages/static-pages';
import { getSeoMeta } from '../seo-meta';

export default PrivacyPage;

export const meta: Route.MetaFunction = () => getSeoMeta('/privacy');
