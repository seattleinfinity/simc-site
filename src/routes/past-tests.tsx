import type { Route } from './+types/past-tests';
import { ResourcesPage } from '../pages/archive-pages';
import { getSeoMeta } from '../seo-meta';

export default function PastTestsRoute() {
  return <ResourcesPage onlyTests />;
}

export const meta: Route.MetaFunction = () => getSeoMeta('/past-tests');
