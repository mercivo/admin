import { resolveDashboardDefaultCurrency } from './dashboard.service';

describe('dashboard default currency', () => {
  it('follows the product-price default instead of the sales-order default', () => {
    expect(resolveDashboardDefaultCurrency({
      defaultCurrency: 'usd',
      salesDefaultCurrency: 'BAM',
      purchaseDefaultCurrency: 'CNY',
    }, 'EUR')).toBe('USD');
  });

  it('falls back to the site value only when the common currency config is absent', () => {
    expect(resolveDashboardDefaultCurrency(undefined, 'EUR')).toBe('EUR');
    expect(resolveDashboardDefaultCurrency(undefined, undefined)).toBe('CNY');
  });
});
