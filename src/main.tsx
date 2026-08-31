import { useEffect } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
import { SeoHead } from './components/seo-head';
import { PageShell } from './components/site-shell';
import { SiteRoutes } from './site-routes';
import './styles.css';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [pathname]);
  return null;
}

function App() {
  const { search } = useLocation();
  useEffect(() => {
    const requestedTheme = new URLSearchParams(search).get('theme');
    document.documentElement.dataset.theme = requestedTheme === 'dark' ? 'dark' : 'light';
  }, [search]);
  return (
    <>
      <SeoHead />
      <ScrollToTop />
      <PageShell>
        <SiteRoutes />
      </PageShell>
    </>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
const app = (
  <BrowserRouter>
    <App />
  </BrowserRouter>
);

if (root.hasChildNodes()) {
  hydrateRoot(root, app);
} else {
  createRoot(root).render(app);
}
