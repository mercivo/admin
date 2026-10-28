import { domainToASCII } from 'url';
import { parse } from 'tldts';

export interface NormalizedDomainInput {
  requestedHostname: string;
  hostname: string;
  apexConverted: boolean;
}

export function normalizeDomainInput(value: string): NormalizedDomainInput {
  const raw = String(value || '').trim().replace(/^https?:\/\//i, '').split('/')[0];
  if (!raw || raw.includes('@') || raw.includes(':') || raw.startsWith('*.')) throw new Error('请输入有效域名');
  const requestedHostname = domainToASCII(raw).toLowerCase().replace(/\.$/, '');
  if (!requestedHostname || requestedHostname.length > 253) throw new Error('请输入有效域名');
  const labels = requestedHostname.split('.');
  if (labels.some(label => !label || label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))) throw new Error('请输入有效域名');
  const parsed = parse(requestedHostname, { allowPrivateDomains: false });
  if (!parsed.domain || !parsed.isIcann) throw new Error('请输入有效的公网域名');
  const apexConverted = requestedHostname === parsed.domain;
  return { requestedHostname, hostname: apexConverted ? `www.${requestedHostname}` : requestedHostname, apexConverted };
}

export async function cnameChainIncludes(
  hostname: string,
  expectedTarget: string,
  lookup: (name: string) => Promise<string[]>,
  maxDepth = 8,
) {
  const normalize = (value: string) => value.toLowerCase().trim().replace(/\.$/, '');
  const expected = normalize(expectedTarget);
  let current = normalize(hostname);
  const visited = new Set<string>();
  for (let depth = 0; depth < maxDepth && !visited.has(current); depth += 1) {
    visited.add(current);
    let records: string[];
    try { records = await lookup(current); } catch { return false; }
    const targets = records.map(normalize);
    if (targets.includes(expected)) return true;
    if (!targets[0]) return false;
    current = targets[0];
  }
  return false;
}
