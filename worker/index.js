const SITE_ORIGIN = 'https://seattleinfinity.org';

// Static navigation requests are redirected by public/_redirects. Mirror the
// rules here for bots and other requests that Cloudflare routes through the
// Worker before the static-assets layer.
export const PERMANENT_REDIRECTS = new Map([
  ['/about', '/about-us'],
  ['/slg', '/about-us'],
  ['/mock-tests', '/past-tests'],
  ['/newsletter', '/newsletters'],
  ['/newletter', '/newsletters'],
  ['/gcalender', '/calendar'],
  ['/calender', '/calendar'],
  ['/announcement', '/press-releases/2026-2-28-mockmathcounts'],
  ['/announcements/mathcounts', '/press-releases/2026-2-28-mockmathcounts'],
  ['/events/SIMC10', '/events/simc10'],
  ['/events/SIMC8', '/events/simc8'],
  ['/events/SIME', '/events/sime'],
  ['/events/simc-8', '/events/simc8'],
  ['/events/sime-8', '/events/simc8'],
  ['/events/mock-sime', '/events/sime'],
]);

export default {
  async fetch(request, env) {
    const requestUrl = new URL(request.url);
    const redirectPath = PERMANENT_REDIRECTS.get(requestUrl.pathname);
    if (redirectPath && (request.method === 'GET' || request.method === 'HEAD')) {
      const destination = new URL(redirectPath, SITE_ORIGIN);
      destination.search = requestUrl.search;
      return Response.redirect(destination, 301);
    }

    return env.ASSETS.fetch(request);
  },
};
