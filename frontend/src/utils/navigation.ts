type AuthorizedRoute = { route: string; menu: string; pages: string[] };

// Keep this order aligned with the tenant sidebar's visual menu order.
const AUTHORIZED_ROUTES: AuthorizedRoute[] = [
  { route: '/dashboard', menu: 'menu.dashboard', pages: ['page.dashboard'] },
  { route: '/products', menu: 'menu.products', pages: ['page.products'] },
  { route: '/product-categories', menu: 'menu.product-categories', pages: ['page.product-categories'] },
  { route: '/sales/orders', menu: 'menu.sales.orders', pages: ['page.sales.orders'] },
  { route: '/sales/shipments', menu: 'menu.sales.shipments', pages: ['page.sales.shipments'] },
  { route: '/customer', menu: 'menu.customers', pages: ['page.customers'] },
  { route: '/purchase/orders', menu: 'menu.purchase.orders', pages: ['page.purchase.orders'] },
  { route: '/purchase/receipts', menu: 'menu.purchase.receipts', pages: ['page.purchase.receipts'] },
  { route: '/purchase/suppliers', menu: 'menu.purchase.suppliers', pages: ['page.purchase.suppliers'] },
  { route: '/inventory/stocks', menu: 'menu.inventory.stocks', pages: ['page.inventory.stocks'] },
  { route: '/inventory/counts', menu: 'menu.inventory.counts', pages: ['page.inventory.counts'] },
  { route: '/inventory/transfers', menu: 'menu.inventory.transfers', pages: ['page.inventory.transfers'] },
  { route: '/inventory/warehouses', menu: 'menu.inventory.warehouses', pages: ['page.inventory.warehouses'] },
  { route: '/storefront/leads', menu: 'menu.storefront.leads', pages: ['page.storefront.leads'] },
  { route: '/storefront/products', menu: 'menu.storefront.products', pages: ['page.storefront.products'] },
  { route: '/site-editor', menu: 'menu.site', pages: ['page.site.editor'] },
  { route: '/storefront-translations', menu: 'menu.site', pages: ['page.site.editor'] },
  { route: '/storefront/settings', menu: 'menu.storefront.settings', pages: ['page.site.settings'] },
  { route: '/storefront/releases', menu: 'menu.storefront.releases', pages: ['page.storefront.releases'] },
  { route: '/finance/receipts', menu: 'menu.finance.receipts', pages: ['page.finance.receipts'] },
  { route: '/finance/payments', menu: 'menu.finance.payments', pages: ['page.finance.payments'] },
  { route: '/finance/statistics', menu: 'menu.finance.statistics', pages: ['page.finance.statistics'] },
  { route: '/system-settings', menu: 'menu.settings', pages: ['page.settings.account'] },
  { route: '/settings?tab=team', menu: 'menu.team', pages: ['page.settings.team'] },
];

export const firstAuthorizedRoute = (permissions: string[]) => {
  const granted = new Set(permissions);
  return AUTHORIZED_ROUTES.find(item => granted.has(item.menu) && item.pages.some(page => granted.has(page)))?.route || '/no-access';
};
