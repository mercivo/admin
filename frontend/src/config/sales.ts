export interface CurrencyOption { code: string; name: string; symbol: string; enabled: boolean; }
export interface CurrencyConfig { currencies: CurrencyOption[]; defaultCurrency: string; purchaseDefaultCurrency: string; salesDefaultCurrency: string; }
export type SalesConfig = CurrencyConfig;
export type GuestPriceMode = 'base' | 'hidden' | 'percentage';
export interface SystemConfig {
  inventoryWarning: { enabled: boolean; threshold: number };
  storefront: { guestAccessEnabled: boolean; guestPriceMode: GuestPriceMode; guestPricePercentage: number };
}

export const DEFAULT_CURRENCY_CONFIG: CurrencyConfig = {
  defaultCurrency: 'CNY',
  purchaseDefaultCurrency: 'CNY',
  salesDefaultCurrency: 'BAM',
  currencies: [
    { code: 'CNY', name: '人民币', symbol: '¥', enabled: true },
    { code: 'BAM', name: '波黑可兑换马克', symbol: 'KM', enabled: true },
    { code: 'USD', name: '美元', symbol: '$', enabled: true },
    { code: 'EUR', name: '欧元', symbol: '€', enabled: true },
  ],
};
export const DEFAULT_SALES_CONFIG = DEFAULT_CURRENCY_CONFIG;

export const DEFAULT_SYSTEM_CONFIG: SystemConfig = {
  inventoryWarning: { enabled: true, threshold: 10 },
  storefront: { guestAccessEnabled: true, guestPriceMode: 'base', guestPricePercentage: 100 },
};
