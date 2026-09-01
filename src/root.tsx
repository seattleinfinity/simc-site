import { useEffect, type ReactNode } from 'react';
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLocation,
  type LinksFunction,
} from 'react-router';
import { PageShell } from './components/site-shell';
import { SITE_URL } from './seo';
import './styles.css';

const CLOUDFLARE_BEACON_URL = 'https://static.cloudflareinsights.com/beacon.min.js';
const CLOUDFLARE_BEACON_TOKEN = '4008da1cd7654137bcb3dd43d290e523';

export const links: LinksFunction = () => [
  { rel: 'sitemap', type: 'application/xml', href: `${SITE_URL}/sitemap.xml` },
  {
    rel: 'alternate',
    type: 'application/rss+xml',
    title: 'Seattle Infinity Math Circle press releases',
    href: `${SITE_URL}/feed.xml`,
  },
  { rel: 'manifest', href: '/site.webmanifest' },
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;600&family=Lora:wght@600;700&family=Source+Serif+4:wght@600&display=swap',
  },
  { rel: 'icon', href: '/int.svg', type: 'image/svg+xml' },
];

function ThemeController() {
  const { search } = useLocation();

  useEffect(() => {
    const requestedTheme = new URLSearchParams(search).get('theme');
    document.documentElement.dataset.theme = requestedTheme === 'dark' ? 'dark' : 'light';
  }, [search]);

  return null;
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en-US">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#0a3158" />
        <meta property="og:locale" content="en_US" />
        <meta property="og:site_name" content="Seattle Infinity Math Circle" />
        <Meta />
        <Links />
        <script
          type="module"
          src={CLOUDFLARE_BEACON_URL}
          data-cf-beacon={JSON.stringify({ token: CLOUDFLARE_BEACON_TOKEN })}
        />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function Root() {
  return (
    <>
      <ThemeController />
      <PageShell>
        <Outlet />
      </PageShell>
    </>
  );
}
