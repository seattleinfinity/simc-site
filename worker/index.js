import redirectTargets from '../redirects.json' with { type: 'json' };

const SITE_ORIGIN = 'https://seattleinfinity.org';

// Keep the edge redirect table in the same source-of-truth manifest used by
// the application and generated static-assets output.
export const PERMANENT_REDIRECTS = new Map(Object.entries(redirectTargets));

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
