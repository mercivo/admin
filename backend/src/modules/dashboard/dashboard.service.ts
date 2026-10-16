import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../product/product.entity';
import { Customer } from '../customer/customer.entity';
import { AppConfig } from '../workspace/app-config.entity';
import { SalesOrder } from '../sales/sales.entity';
import { PurchaseOrder } from '../purchase/purchase.entity';
import { FinanceTransaction } from '../finance/finance.entity';
import { InventoryBalance } from '../inventory/inventory.entity';
import { Site } from '../site/site.entity';
import { ProductCategory } from '../product-category/product-category.entity';
import { Warehouse } from '../inventory/inventory.entity';

export function resolveDashboardDefaultCurrency(currencyConfig: unknown, siteDefaultCurrency?: string | null) {
  const configured = (currencyConfig as { defaultCurrency?: unknown } | null | undefined)?.defaultCurrency;
  return String(configured || siteDefaultCurrency || 'CNY').toUpperCase();
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(Customer) private readonly customerRepository: Repository<Customer>,
    @InjectRepository(AppConfig) private readonly configRepository: Repository<AppConfig>,
    @InjectRepository(SalesOrder) private readonly salesOrderRepository: Repository<SalesOrder>,
    @InjectRepository(PurchaseOrder) private readonly purchaseOrderRepository: Repository<PurchaseOrder>,
    @InjectRepository(FinanceTransaction) private readonly financeRepository: Repository<FinanceTransaction>,
    @InjectRepository(InventoryBalance) private readonly balanceRepository: Repository<InventoryBalance>,
    @InjectRepository(Site) private readonly siteRepository: Repository<Site>,
  ) {}

  async getStats(siteId: string) {
    const [totalProducts, publishedProducts, pendingProducts, customers, dashboardConfig, site, salesStatus, purchaseStatus, pendingFunds, financialRows, monthlySales, monthlyPurchases] = await Promise.all([
      this.productRepository.count({ where: { siteId } }),
      this.productRepository.count({ where: { siteId, status: 'published' } }),
      this.productRepository.count({ where: { siteId, status: 'pending' } }),
      this.customerRepository.find({ where: { siteId } }),
      this.configRepository.findOne({ where: { key: `${siteId}:dashboard` } }).then(async scoped => scoped || this.configRepository.findOne({ where: { key: 'dashboard' } })),
      this.siteRepository.findOne({ where: { id: siteId } }),
      this.salesOrderRepository.createQueryBuilder('orders').select('orders.status', 'status').addSelect('COUNT(orders.id)', 'count').where('orders.site_id = :siteId', { siteId }).groupBy('orders.status').getRawMany(),
      this.purchaseOrderRepository.createQueryBuilder('orders').select('orders.status', 'status').addSelect('COUNT(orders.id)', 'count').where('orders.site_id = :siteId', { siteId }).groupBy('orders.status').getRawMany(),
      this.financeRepository.count({ where: { siteId, status: 'pending' } }),
      this.financeRepository.createQueryBuilder('transaction').select('transaction.currency', 'currency').addSelect("SUM(CASE WHEN transaction.type = 'receipt' AND transaction.status = 'confirmed' THEN transaction.amount ELSE 0 END)", 'receipts').addSelect("SUM(CASE WHEN transaction.type = 'payment' AND transaction.status = 'confirmed' THEN transaction.amount ELSE 0 END)", 'payments').where('transaction.site_id = :siteId', { siteId }).groupBy('transaction.currency').getRawMany(),
      this.monthlyCounts(this.salesOrderRepository, siteId),
      this.monthlyCounts(this.purchaseOrderRepository, siteId),
    ]);

    const topProducts = await this.productRepository.find({
      where: { siteId, status: 'published' },
      order: { stock: 'DESC' },
      take: 4,
    });
    const [currencyConfig, systemConfig] = await Promise.all([
      this.configRepository.findOne({ where: { key: `${siteId}:currency` } }),
      this.configRepository.findOne({ where: { key: `${siteId}:system` } }),
    ]);
    const warningConfig = (systemConfig?.value as any)?.inventoryWarning || { enabled: true, threshold: 10 };
    const warningEnabled = warningConfig.enabled !== false;
    const warningThreshold = Math.max(0, Number(warningConfig.threshold) || 0);
    const availableStock = '(balance.on_hand - balance.reserved)';
    const lowStockCondition = warningEnabled ? `${availableStock} <= :warningThreshold` : `${availableStock} <= 0`;
    const [salesAmounts, purchaseAmounts, salesMonthly, purchaseMonthly, topSellingProducts, latestSalesOrders, lowStockCount, lowStockProducts, categoryDistribution, salesCategoryDistribution] = await Promise.all([
      this.salesOrderRepository.createQueryBuilder('orders').select('orders.currency', 'currency').addSelect("SUM(CASE WHEN orders.status <> 'cancelled' THEN orders.total_amount ELSE 0 END)", 'total').addSelect("SUM(CASE WHEN orders.status <> 'cancelled' AND YEAR(orders.created_at) = YEAR(CURRENT_DATE()) AND MONTH(orders.created_at) = MONTH(CURRENT_DATE()) THEN orders.total_amount ELSE 0 END)", 'currentMonth').where('orders.site_id = :siteId', { siteId }).groupBy('orders.currency').getRawMany(),
      this.purchaseOrderRepository.createQueryBuilder('orders').select('orders.currency', 'currency').addSelect("SUM(CASE WHEN orders.status NOT IN ('draft', 'cancelled') THEN orders.total_amount ELSE 0 END)", 'total').addSelect("SUM(CASE WHEN orders.status NOT IN ('draft', 'cancelled') AND YEAR(orders.created_at) = YEAR(CURRENT_DATE()) AND MONTH(orders.created_at) = MONTH(CURRENT_DATE()) THEN orders.total_amount ELSE 0 END)", 'currentMonth').where('orders.site_id = :siteId', { siteId }).groupBy('orders.currency').getRawMany(),
      this.monthlyAmounts(this.salesOrderRepository, siteId, false),
      this.monthlyAmounts(this.purchaseOrderRepository, siteId, true),
      this.salesOrderRepository.manager.createQueryBuilder().select('orders.currency', 'currency').addSelect('line.product_id', 'productId').addSelect('line.product_name', 'name').addSelect('line.product_sku', 'sku').addSelect('SUM(line.quantity)', 'quantity').addSelect('SUM(line.amount)', 'amount').from('sales_order_lines', 'line').innerJoin('sales_orders', 'orders', 'orders.id = line.order_id').where('orders.site_id = :siteId', { siteId }).andWhere("orders.status <> 'cancelled'").groupBy('orders.currency').addGroupBy('line.product_id').addGroupBy('line.product_name').addGroupBy('line.product_sku').orderBy('SUM(line.amount)', 'DESC').getRawMany(),
      this.salesOrderRepository.createQueryBuilder('orders').leftJoin(Customer, 'customer', 'customer.id = orders.customer_id').select('orders.id', 'id').addSelect('orders.order_no', 'orderNo').addSelect('customer.name', 'customerName').addSelect('orders.currency', 'currency').addSelect('orders.total_amount', 'amount').addSelect('orders.status', 'status').addSelect('orders.created_at', 'createdAt').where('orders.site_id = :siteId', { siteId }).orderBy('orders.created_at', 'DESC').limit(5).getRawMany(),
      this.balanceRepository.createQueryBuilder('balance').where('balance.site_id = :siteId', { siteId }).andWhere(lowStockCondition, { warningThreshold }).getCount(),
      this.balanceRepository.createQueryBuilder('balance').leftJoin(Product, 'product', 'product.id = balance.product_id').leftJoin(Warehouse, 'warehouse', 'warehouse.id = balance.warehouse_id').select('balance.id', 'id').addSelect('product.id', 'productId').addSelect('product.name_zh', 'name').addSelect('product.sku', 'sku').addSelect('balance.variant_key', 'variantKey').addSelect('warehouse.name', 'warehouseName').addSelect(availableStock, 'available').addSelect(':warningThreshold', 'warningStock').where('balance.site_id = :siteId', { siteId }).andWhere(lowStockCondition, { warningThreshold }).orderBy(availableStock, 'ASC').limit(8).getRawMany(),
      this.productRepository.createQueryBuilder('product').leftJoin(ProductCategory, 'category', 'category.site_id = product.site_id AND category.code = product.category').select('product.category', 'category').addSelect("COALESCE(category.label, product.category, '未分类')", 'categoryName').addSelect('COUNT(product.id)', 'count').where('product.site_id = :siteId', { siteId }).groupBy('product.category').addGroupBy('category.label').orderBy('COUNT(product.id)', 'DESC').getRawMany(),
      this.salesOrderRepository.manager.createQueryBuilder().select('orders.currency', 'currency').addSelect('product.category', 'category').addSelect("COALESCE(category.label, product.category, '未分类')", 'categoryName').addSelect('SUM(line.amount)', 'amount').from('sales_order_lines', 'line').innerJoin('sales_orders', 'orders', 'orders.id = line.order_id').leftJoin('products', 'product', 'product.id = line.product_id AND product.site_id = orders.site_id').leftJoin('product_categories', 'category', 'category.site_id = orders.site_id AND category.code = product.category').where('orders.site_id = :siteId', { siteId }).andWhere("orders.status <> 'cancelled'").groupBy('orders.currency').addGroupBy('product.category').addGroupBy('category.label').orderBy('SUM(line.amount)', 'DESC').getRawMany(),
    ]);
    const lowStockProductEntities = lowStockProducts.length ? await this.productRepository.find({ where: lowStockProducts.map(row => ({ siteId, id: row.productId })) }) : [];
    const configuredCurrencies = ((currencyConfig?.value as any)?.currencies || []).filter((item: any) => item.enabled).map((item: any) => ({ code: item.code, symbol: item.symbol, name: item.name }));
    const currencyCodes = [...new Set([...configuredCurrencies.map((item: any) => item.code), ...salesAmounts.map(row => row.currency), ...purchaseAmounts.map(row => row.currency), ...financialRows.map(row => row.currency)])];

    return {
      totalProducts,
      publishedProducts,
      pendingProducts,
      totalCustomers: customers.length,
      customerValue: customers.reduce((sum, customer) => sum + Number(customer.totalAmount), 0),
      siteStatus: site?.status || 'draft',
      orders: {
        salesTotal: salesStatus.reduce((sum, row) => sum + Number(row.count), 0),
        salesOpen: salesStatus.filter(row => ['confirmed', 'partially_shipped'].includes(row.status)).reduce((sum, row) => sum + Number(row.count), 0),
        purchaseTotal: purchaseStatus.reduce((sum, row) => sum + Number(row.count), 0),
        purchaseOpen: purchaseStatus.filter(row => ['draft', 'confirmed', 'partially_received'].includes(row.status)).reduce((sum, row) => sum + Number(row.count), 0),
      },
      risks: { pendingFunds, lowStock: lowStockCount, pendingProducts },
      defaultCurrency: resolveDashboardDefaultCurrency(currencyConfig?.value, site?.defaultCurrency),
      currencies: configuredCurrencies,
      financials: currencyCodes.map(currency => ({ currency, salesAmount: Number(salesAmounts.find(row => row.currency === currency)?.total || 0), purchaseAmount: Number(purchaseAmounts.find(row => row.currency === currency)?.total || 0), currentMonthSales: Number(salesAmounts.find(row => row.currency === currency)?.currentMonth || 0), currentMonthPurchases: Number(purchaseAmounts.find(row => row.currency === currency)?.currentMonth || 0), receipts: Number(financialRows.find(row => row.currency === currency)?.receipts || 0), payments: Number(financialRows.find(row => row.currency === currency)?.payments || 0), monthly: Array.from({ length: 12 }, (_, index) => ({ month: index + 1, label: `${index + 1}月`, sales: Number(salesMonthly.find(row => row.currency === currency && Number(row.month) === index + 1)?.amount || 0), purchases: Number(purchaseMonthly.find(row => row.currency === currency && Number(row.month) === index + 1)?.amount || 0) })) })),
      monthlyOrders: Array.from({ length: 12 }, (_, index) => {
        const month = `${new Date().getFullYear()}-${String(index + 1).padStart(2, '0')}`;
        return { month, label: `${index + 1}月`, sales: Number(monthlySales.find(row => row.month === month)?.count || 0), purchases: Number(monthlyPurchases.find(row => row.month === month)?.count || 0) };
      }),
      traffic: Array.isArray((dashboardConfig?.value as { traffic?: unknown[] } | undefined)?.traffic) ? (dashboardConfig?.value as { traffic: unknown[] }).traffic : [],
      topProducts: topProducts.map((p) => ({ name: p.nameZh, sku: p.sku, stock: p.stock, status: p.status })),
      topSellingProducts: topSellingProducts.map(row => ({ currency: row.currency, productId: row.productId, name: row.name, sku: row.sku, quantity: Number(row.quantity), amount: Number(row.amount) })),
      latestSalesOrders: latestSalesOrders.map(row => ({ ...row, amount: Number(row.amount) })),
      lowStockProducts: lowStockProducts.map(row => {
        const product = lowStockProductEntities.find(item => item.id === row.productId);
        const variant = product?.variants?.find(item => item.id === row.variantKey);
        return { ...row, variantLabel: variant ? `${variant.specification}: ${variant.option}` : '默认规格', available: Number(row.available), warningStock: warningThreshold };
      }),
      categoryDistribution: categoryDistribution.map(row => ({ category: row.category || '未分类', categoryName: row.categoryName || row.category || '未分类', count: Number(row.count) })),
      salesCategoryDistribution: salesCategoryDistribution.map(row => ({ currency: row.currency, category: row.category || '未分类', categoryName: row.categoryName || row.category || '未分类', amount: Number(row.amount) })),
    };
  }

  private monthlyCounts(repository: Repository<SalesOrder> | Repository<PurchaseOrder>, siteId: string) {
    return repository.createQueryBuilder('orders').select("DATE_FORMAT(orders.created_at, '%Y-%m')", 'month').addSelect('COUNT(orders.id)', 'count').where('orders.site_id = :siteId', { siteId }).andWhere('YEAR(orders.created_at) = YEAR(CURRENT_DATE())').andWhere("orders.status <> 'cancelled'").groupBy("DATE_FORMAT(orders.created_at, '%Y-%m')").getRawMany();
  }

  private monthlyAmounts(repository: Repository<SalesOrder> | Repository<PurchaseOrder>, siteId: string, purchase: boolean) {
    return repository.createQueryBuilder('orders').select('orders.currency', 'currency').addSelect('MONTH(orders.created_at)', 'month').addSelect('SUM(orders.total_amount)', 'amount').where('orders.site_id = :siteId', { siteId }).andWhere('YEAR(orders.created_at) = YEAR(CURRENT_DATE())').andWhere(purchase ? "orders.status NOT IN ('draft', 'cancelled')" : "orders.status <> 'cancelled'").groupBy('orders.currency').addGroupBy('MONTH(orders.created_at)').getRawMany();
  }
}
