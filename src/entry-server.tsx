import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom';
import { PageShell } from './components/site-shell';
import { PRESS_CONTENT } from './content';
import { SiteRoutes } from './site-routes';

export { SITE_URL, SEO_ROUTES, getSeoData } from './seo';
export { PRESS_CONTENT };

/**
 * Render the same shell and route tree as the browser entry for one URL.
 * Effects in the browser entry intentionally do not run during SSR, so this
 * produces markup that can be hydrated by the client entry without a second
 * hand-authored page implementation.
 */
export function render(pathname: string): string {
  return renderToString(
    <StaticRouter location={pathname}>
      <PageShell>
        <SiteRoutes />
      </PageShell>
    </StaticRouter>,
  );
}
