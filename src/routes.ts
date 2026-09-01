import type { RouteConfig } from '@react-router/dev/routes';
import { index, route } from '@react-router/dev/routes';

export default [
  index('./routes/home.tsx'),
  route('events', './routes/events.tsx'),
  route('events/:slug', './routes/event-detail.tsx'),
  route('resources', './routes/resources.tsx'),
  route('past-tests', './routes/past-tests.tsx'),
  route('past-tests/:slug', './routes/past-test-detail.tsx'),
  route('press-releases', './routes/press-releases.tsx'),
  route('press-releases/:slug', './routes/press-detail.tsx'),
  route('contact', './routes/contact.tsx'),
  route('about-us', './routes/about.tsx'),
  route('newsletters', './routes/newsletters.tsx'),
  route('calendar', './routes/calendar.tsx'),
  route('potm', './routes/potm.tsx'),
  route('*', './routes/not-found.tsx'),
] satisfies RouteConfig;
