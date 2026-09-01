import type { Route } from './+types/resources';
import { ResourcesPage } from '../pages/archive-pages';
import { getSeoMeta } from '../seo-meta';

export default function ResourcesRoute() {
  return <ResourcesPage />;
}

export const meta: Route.MetaFunction = () => getSeoMeta('/resources');
