export const ACCESS_TOKEN_KEY = 'mercivo_access_token';
export const USER_KEY = 'mercivo_user';
export const TENANT_KEY = 'mercivo_tenant';
export const SESSION_EXPIRED_PATH = '/login?reason=session-expired';

const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000;

type JwtPayload = { exp?: unknown; iat?: unknown };

const decodePayload = (token: string): JwtPayload | null => {
  try {
    const encoded = token.split('.')[1];
    if (!encoded) return null;
    const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return JSON.parse(atob(padded)) as JwtPayload;
  } catch {
    return null;
  }
};

export const sessionExpiresAt = (token: string): number | null => {
  const payload = decodePayload(token);
  const issuedAt = typeof payload?.iat === 'number' ? payload.iat * 1000 : NaN;
  const expiresAt = typeof payload?.exp === 'number' ? payload.exp * 1000 : NaN;
  if (!Number.isInteger(issuedAt) || !Number.isInteger(expiresAt) || issuedAt <= 0 || expiresAt <= issuedAt) return null;
  return Math.min(expiresAt, issuedAt + MAX_SESSION_AGE_MS);
};

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

export const clearSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(TENANT_KEY);
};

export const isSessionValid = (token: string, now = Date.now()) => {
  const expiresAt = sessionExpiresAt(token);
  return expiresAt !== null && expiresAt > now;
};

export const redirectToExpiredLogin = () => {
  clearSession();
  if (location.pathname !== '/login' || new URLSearchParams(location.search).get('reason') !== 'session-expired') {
    location.assign(SESSION_EXPIRED_PATH);
  }
};
