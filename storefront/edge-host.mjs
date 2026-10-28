import { timingSafeEqual } from 'node:crypto';

const equalSecret = (provided, expected) => {
  if (!provided || !expected) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

const validHost = value => /^[a-z0-9.-]+(?::\d+)?$/i.test(value);
const loggedHost = value => validHost(value) ? value : '[invalid]';

export function effectiveRequestHost(headers, expectedSecret = process.env.EDGE_PROXY_SHARED_SECRET || '', onRejected = () => {}) {
  const directHost = String(headers.host || 'localhost');
  const originalHost = String(headers['x-mercivo-original-host'] || '');
  const providedSecret = String(headers['x-mercivo-edge-token'] || '');
  if (!originalHost) return directHost;
  let reason = '';
  if (!validHost(originalHost)) reason = 'invalid_original_host';
  else if (!providedSecret) reason = 'missing_edge_token';
  else if (!expectedSecret) reason = 'missing_expected_secret';
  else if (!equalSecret(providedSecret, expectedSecret)) reason = 'edge_token_mismatch';
  if (reason) {
    onRejected({ requestHost: loggedHost(directHost), originalHost: loggedHost(originalHost), reason });
    return directHost;
  }
  return originalHost;
}
