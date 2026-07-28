export const ALLOWED_OPEN_SCHEMES = ['http:', 'https:', 'mailto:'];

export type ProviderPopupRoute = 'external' | 'in-app' | 'deny';

const AUTH_POPUP_HOSTS = new Set([
  'accounts.google.com',
  'appleid.apple.com',
  'login.live.com',
  'login.microsoftonline.com',
]);

const AUTH_HOST_LABELS = new Set(['accounts', 'auth', 'identity', 'login', 'signin']);
const AUTH_PATH_SEGMENTS = new Set(['auth', 'authorize', 'authorization', 'login', 'oauth', 'oauth2', 'sign-in', 'signin']);

/** Returns true when a web URL represents an authentication flow. */
function isAuthPopupUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const leadingHostLabel = hostname.split('.')[0];
    const pathSegments = parsedUrl.pathname.toLowerCase().split('/').filter(Boolean);

    return AUTH_POPUP_HOSTS.has(hostname)
      || AUTH_HOST_LABELS.has(leadingHostLabel)
      || pathSegments.some(segment => AUTH_PATH_SEGMENTS.has(segment));
  } catch {
    return false;
  }
}

/** Returns where a provider webview pop-up should open. */
export function getProviderPopupRoute(url: string): ProviderPopupRoute {
  const lower = url.toLowerCase();

  if (lower.startsWith('http:') || lower.startsWith('https:')) {
    return isAuthPopupUrl(url) ? 'in-app' : 'external';
  }

  return ALLOWED_OPEN_SCHEMES.some(scheme => lower.startsWith(scheme)) ? 'external' : 'deny';
}
