import { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, useLocation } from 'react-router-dom';
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
      <ScrollToTop />
      <PageShell>
        <SiteRoutes />
      </PageShell>
    </>
  );
}

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');
createRoot(root).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
