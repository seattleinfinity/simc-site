import redirectTargets from '../redirects.json';

const REDIRECT_TARGETS = new Map(Object.entries(redirectTargets));

const normalizePath = (input: string): string => {
  let value = String(input || '').trim();
  const queryOrHash = value.search(/[?#]/);
  if (queryOrHash >= 0) value = value.slice(0, queryOrHash);
  if (!value) return '/';

  try {
    value = decodeURI(value);
  } catch {
    // Keep malformed paths unchanged so they cannot accidentally match an alias.
  }

  if (!value.startsWith('/')) value = `/${value}`;
  value = value.replace(/\/+/g, '/');
  if (value.length > 1) value = value.replace(/\/+$/, '');
  return value || '/';
};

export function getRedirectTarget(pathname: string): string | undefined {
  return REDIRECT_TARGETS.get(normalizePath(pathname));
}
