import { timingSafeEqual } from 'node:crypto';

const equalSecret = (provided, expected) => {
  if (!provided || !expected) return false;
  const left = Buffer.from(provided);
  const right = Buffer.from(expected);
  return left.length === right.length && timingSafeEqual(left, right);
};

export function effectiveRequestHost(headers, expectedSecret = process.env.EDGE_PROXY_SHARED_SECRET || '') {
  const directHost = String(headers.host || 'localhost');
  const originalHost = String(headers['x-mercivo-original-host'] || '');
  const providedSecret = String(headers['x-mercivo-edge-token'] || '');
  if (!equalSecret(providedSecret, expectedSecret) || !/^[a-z0-9.-]+(?::\d+)?$/i.test(originalHost)) return directHost;
  return originalHost;
}
