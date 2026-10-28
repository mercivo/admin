import { cnameChainIncludes, normalizeDomainInput } from './domain-hostname';

describe('normalizeDomainInput', () => {
  it('converts an apex domain to www', () => {
    expect(normalizeDomainInput('https://Example.com/')).toEqual({
      requestedHostname: 'example.com',
      hostname: 'www.example.com',
      apexConverted: true,
    });
  });

  it('keeps an explicit subdomain', () => {
    expect(normalizeDomainInput('shop.example.com')).toMatchObject({
      requestedHostname: 'shop.example.com',
      hostname: 'shop.example.com',
      apexConverted: false,
    });
  });

  it('recognizes multi-level public suffixes', () => {
    expect(normalizeDomainInput('example.co.uk').hostname).toBe('www.example.co.uk');
    expect(normalizeDomainInput('store.example.co.uk').hostname).toBe('store.example.co.uk');
  });

  it.each(['localhost', '*.example.com', 'bad_domain.com', 'https://example.com:8443'])('rejects invalid input %s', value => {
    expect(() => normalizeDomainInput(value)).toThrow();
  });
});

describe('cnameChainIncludes', () => {
  it('accepts a direct target and a propagated CNAME chain', async () => {
    const lookup = jest.fn(async (name: string) => name === 'shop.example.com'
      ? ['edge.example.net.']
      : ['customers.aihubflux.com.']);
    await expect(cnameChainIncludes('shop.example.com', 'customers.aihubflux.com', lookup)).resolves.toBe(true);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('stops safely on a CNAME cycle', async () => {
    const lookup = jest.fn(async (name: string) => [name === 'a.example.com' ? 'b.example.com' : 'a.example.com']);
    await expect(cnameChainIncludes('a.example.com', 'customers.aihubflux.com', lookup)).resolves.toBe(false);
  });

  it('rejects a missing or incorrect CNAME target', async () => {
    await expect(cnameChainIncludes('shop.example.com', 'customers.aihubflux.com', async () => [])).resolves.toBe(false);
    await expect(cnameChainIncludes('shop.example.com', 'customers.aihubflux.com', async () => ['other.example.net'])).resolves.toBe(false);
  });
});
