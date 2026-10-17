import React, { useState, useEffect } from "react";
import { Button, Empty, Input, Pagination, Select, Tree } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  Plus,
  Search,
  Edit,
  Eye,
  Trash2,
  List,
  BarChart2,
  ShoppingCart,
  Tag,
  Package,
  Globe,
  AlertTriangle,
  Download,
  Ban,
} from "lucide-react";
import {
  AppModal,
  AppTable,
  createActionColumn,
  ProductImage,
  ProductGallery,
  ProductTableCell,
  QuotaUsage,
  StatusBadge,
  TableActionButton,
  TableActions,
  Toast,
} from "../../components/shared";
import {
  productApi,
  productCategoryApi,
  workspaceApi,
} from "../../services/api/index";
import { useNavigate } from "react-router-dom";
import type { Product, ProductCategory } from "../../types";
import { can } from "../../utils/permissions";
import { useTablePagination } from "../../hooks/useTablePagination";
import { DEFAULT_CURRENCY_CONFIG, type CurrencyConfig } from '../../config/sales';

const productPriceRange = (product: Product, currency: string): string | null => {
  const pricing = product.currencyPrices?.[currency];
  if (!pricing) return null;
  const base = Number(pricing.basePrice) || 0;
  const values = product.variants?.length
    ? product.variants.map(variant => base + Number(variant.surcharges?.[currency] ?? 0))
    : [base];
  const min = Math.min(...values).toFixed(2);
  const max = Math.max(...values).toFixed(2);
  return min === max ? min : `${min}～${max}`;
};
const displayProductPrice = (product: Product, currency: string, symbol: string) => {
  const range = productPriceRange(product, currency);
  return range === null ? null : `${symbol} ${range}`;
};

const downloadCsv = (filename: string, rows: Array<Array<string | number>>) => {
  const csv = rows
    .map((row) =>
      row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","),
    )
    .join("\n");
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

// ─────────────── Product Preview Modal ───────────────

const ProductPreviewModal: React.FC<{
  product: Product;
  categoryName: string;
  currency: string;
  currencySymbol: string;
  onClose: () => void;
  onEdit: () => void;
}> = ({ product, categoryName, currency, currencySymbol, onClose, onEdit }) => (
  <AppModal
    open
    title={
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Eye className="h-4 w-4" />
        </div>
        <div>
          <div>{product.nameZh}</div>
        </div>
      </div>
    }
    onCancel={onClose}
    width={780}
    footer={
      <>
        <Button onClick={onClose}>关闭</Button>
        <Button
          onClick={onEdit}
          type="primary"
          icon={<Edit className="h-4 w-4" />}
        >
          编辑商品
        </Button>
      </>
    }
  >
    <div className="space-y-5">
      <div className="grid gap-5 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="relative">
          <ProductGallery images={product.images} fallbackImage={product.img} alt={product.nameZh || '-'} />
          <div className="absolute right-3 top-3 flex gap-2">
            {product.hot && (
              <span className="rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white shadow">
                热销
              </span>
            )}
            <StatusBadge status={product.status} />
          </div>
        </div>
        <div className="flex min-w-0 flex-col">
          <div className="mb-4">
            <span className="rounded-lg bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
              {categoryName}
            </span>
            <h3 className="mt-3 text-xl font-bold text-foreground">
              {product.nameZh || "未命名商品"}
            </h3>
          </div>
          <div className="grid grid-cols-2 overflow-hidden rounded-xl border border-border">
            {[
              { icon: Tag, label: "商品编码", value: product.sku || "-" },
              {
                icon: ShoppingCart,
                label: `价格区间（${currency}）`,
                value: displayProductPrice(product, currency, currencySymbol) || "-",
              },
              {
                icon: Package,
                label: "总库存",
                value: product.stock.toLocaleString(),
              },
              {
                icon: Globe,
                label: "最小起订量",
                value: product.moq.toLocaleString(),
              },
            ].map(({ icon: Icon, label, value }, index) => (
              <div
                key={label}
                className={`p-3.5 ${index % 2 === 0 ? "border-r" : ""} ${index < 2 ? "border-b" : ""} border-border`}
              >
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Icon className="h-3.5 w-3.5 text-primary" />
                  {label}
                </div>
                <div
                  className="mt-1.5 truncate text-sm font-bold text-foreground"
                  title={String(value)}
                >
                  {value}
                </div>
              </div>
            ))}
          </div>
          {(product.tags?.length || product.badge) && (
            <div className="mt-4">
              <div className="mb-2 text-xs font-semibold text-muted-foreground">
                商品标签
              </div>
              <div className="flex flex-wrap gap-2">
                {product.badge && (
                  <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs text-amber-700">
                    {product.badge}
                  </span>
                )}
                {product.tags?.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-lg bg-secondary px-2.5 py-1 text-xs text-foreground"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <section>
        <div className="mb-2 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-foreground">规格与库存</h4>
          <span className="text-xs text-muted-foreground">
            {product.variants?.length || 0} 个规格
          </span>
        </div>
        {(product.variants?.length || 0) > 0 ? (
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full table-fixed text-sm">
              <thead className="bg-secondary/70 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left">规格</th>
                  <th className="px-4 py-2.5 text-left">选项</th>
                  <th className="px-4 py-2.5 text-center">库存</th>
                  <th className="px-4 py-2.5 text-right">规格价</th>
                </tr>
              </thead>
              <tbody>
                {product.variants!.map((variant, index) => (
                  <tr
                    key={
                      variant.id ||
                      `${variant.specification}-${variant.option}-${index}`
                    }
                    className="border-t border-border"
                  >
                    <td className="px-4 py-3 font-medium text-foreground">
                      {variant.specification || "-"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {variant.option || "-"}
                    </td>
                    <td className="px-4 py-3 text-center font-medium">
                      {variant.stock.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-primary">
                      {(
                        Number(product.currencyPrices?.[currency]?.basePrice || 0) +
                        Number(variant.surcharges?.[currency] ?? 0)
                      ).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border px-4 py-7 text-center text-sm text-muted-foreground">
            该商品暂无规格，库存按基础商品管理
          </div>
        )}
      </section>
      {product.description && (
        <section>
          <h4 className="mb-2 text-sm font-semibold text-foreground">
            商品描述
          </h4>
          <div className="whitespace-pre-wrap rounded-xl border border-border bg-secondary/20 p-4 text-sm leading-6 text-foreground">
            {product.description
              .replace(/<[^>]*>/g, " ")
              .replace(/\s+/g, " ")
              .trim()}
          </div>
        </section>
      )}
    </div>
  </AppModal>
);

// ─────────────── Delete Confirmation Modal ───────────────

const DeleteConfirmModal: React.FC<{
  product: Product;
  onClose: () => void;
  onConfirm: () => void;
}> = ({ product, onClose, onConfirm }) => (
  <AppModal
    open
    title="确认删除商品"
    onCancel={onClose}
    onOk={onConfirm}
    okText="确认删除"
    cancelText="取消"
    okButtonProps={{ danger: true }}
    width={440}
  >
    <div className="py-3 text-center">
      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-6 h-6 text-red-500" />
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        确定要删除 <strong className="text-foreground">{product.nameZh}</strong>
        （商品编码：{product.sku}）吗？此操作不可撤销。
      </p>
      {product.status === "published" && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 text-left">
          该商品当前处于<strong>已同步</strong>状态，删除后将自动从独立站商品池移除。
        </div>
      )}
    </div>
  </AppModal>
);

// ─────────────── Batch Operations Modal ───────────────

const BatchConfirmModal: React.FC<{
  count: number;
  action: "offline" | "export";
  onClose: () => void;
  onConfirm: () => void;
}> = ({ count, action, onClose, onConfirm }) => {
  const isOffline = action === "offline";
  return (
    <AppModal
      open
      title={isOffline ? "批量取消同步" : "导出商品数据"}
      onCancel={onClose}
      onOk={onConfirm}
      okText={isOffline ? "确认取消同步" : "确认导出"}
      cancelText="取消"
      okButtonProps={isOffline ? { danger: true } : undefined}
      width={440}
    >
      <div className="py-3 text-center">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${isOffline ? "bg-amber-100" : "bg-primary/10"}`}
        >
          {isOffline ? (
            <Ban className="w-6 h-6 text-amber-500" />
          ) : (
            <Download className="w-6 h-6 text-primary" />
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {isOffline
            ? `确定要将选中的 ${count} 件商品取消同步吗？操作后商品将从独立站商品池移除。`
            : `确定要导出选中的 ${count} 件商品数据吗？将导出为 Excel 格式。`}
        </p>
      </div>
    </AppModal>
  );
};

// ─────────────── Products Page ───────────────

const ProductsPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Array<Product["id"]>>([]);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [category, setCategory] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categories, setCategories] = useState<ProductCategory[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({});
  const [allProductCount, setAllProductCount] = useState(0);
  const [productLimit, setProductLimit] = useState<number | null>(null);
  const [currencyConfig, setCurrencyConfig] = useState<CurrencyConfig>(DEFAULT_CURRENCY_CONFIG);
  const [priceCurrency, setPriceCurrency] = useState(DEFAULT_CURRENCY_CONFIG.defaultCurrency);
  const pagination = useTablePagination();
  const selectedCategoryCodes =
    category === "all"
      ? []
      : categories.flatMap((parent) =>
          parent.code === category
            ? [parent.code, ...parent.children.map((child) => child.code)]
            : parent.children.some((child) => child.code === category)
              ? [category]
              : [],
        );

  // Modal states
  const [previewProduct, setPreviewProduct] = useState<Product | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<Product | null>(null);
  const [batchAction, setBatchAction] = useState<"offline" | "export" | null>(
    null,
  );
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true);
      productApi
      .list({ page: pagination.current, pageSize: pagination.pageSize, keyword: search || undefined, category: category === "all" ? undefined : selectedCategoryCodes.join(","), status: statusFilter === "all" ? undefined : statusFilter })
      .then(result => { setProducts(result.items); setCategoryCounts(result.summary.categoryCounts); setAllProductCount(result.summary.totalProducts); pagination.reconcile(result.total); })
      .catch(() => {})
      .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [pagination.current, pagination.pageSize, search, category, statusFilter, categories]);
  useEffect(() => {
    workspaceApi
      .getSettings()
      .then((workspace) => setProductLimit(workspace.billing.limits.products))
      .catch(() => setProductLimit(null));
    workspaceApi.getConfig<CurrencyConfig>('currency').then(config => {
      const next = { ...DEFAULT_CURRENCY_CONFIG, ...config, currencies: config.currencies?.length ? config.currencies : DEFAULT_CURRENCY_CONFIG.currencies };
      setCurrencyConfig(next);
      setPriceCurrency(next.defaultCurrency);
    }).catch(() => undefined);
    productCategoryApi
      .list()
      .then((productCategories: ProductCategory[]) => {
        setCategories(
          productCategories
            .filter((parent) => parent.status === "enabled")
            .map((parent) => ({
              ...parent,
              children: parent.children.filter(
                (child) => child.status === "enabled",
              ),
            })),
        );
      })
      .catch(() => setCategories([]));
  }, []);
  useEffect(() => { pagination.reset(); }, [search, category, statusFilter]);

  const categoryCount = (code: string) => {
    const parent = categories.find((item) => item.code === code);
    const codes = parent
      ? [parent.code, ...parent.children.map((child) => child.code)]
      : [code];
    return codes.reduce((sum, categoryCode) => sum + (categoryCounts[categoryCode] || 0), 0);
  };
  const categoryLabel = (code: string) =>
    categories.find((parent) => parent.code === code)?.label ||
    categories
      .flatMap((parent) => parent.children)
      .find((child) => child.code === code)?.label ||
    "未分类";
  const selectedCurrency = currencyConfig.currencies.find(item => item.code === priceCurrency);
  const selectedCurrencySymbol = selectedCurrency?.symbol || priceCurrency;
  const categoryTreeData = categories.map((parent) => ({
    key: parent.code,
    title: (
        <span className="flex min-h-6 min-w-0 flex-1 items-center justify-between gap-2">
          <span className="min-w-0 flex-1 truncate text-sm font-normal leading-5" title={parent.label}>
            {parent.label}
          </span>
          <span className="min-w-5 shrink-0 text-right text-xs leading-5 tabular-nums text-muted-foreground">
          {categoryCount(parent.code)}
        </span>
      </span>
    ),
    children: parent.children.map((child) => ({
      key: child.code,
      title: (
        <span className="flex min-h-6 min-w-0 flex-1 items-center justify-between gap-2">
          <span className="min-w-0 flex-1 truncate text-sm leading-5" title={child.label}>{child.label}</span>
          <span className="min-w-5 shrink-0 text-right text-xs leading-5 tabular-nums text-muted-foreground">
            {categoryCount(child.code)}
          </span>
        </span>
      ),
    })),
  }));

  const filtered = products;
  const gridProducts = products;
  const productQuotaReached =
    productLimit !== null && allProductCount >= productLimit;

  const columns: ColumnsType<Product> = [
    {
      title: "商品",
      width: 300,
      render: (_, product) => <ProductTableCell product={product} categoryName={categoryLabel(product.category)} />,
    },
    {
      title: "商品编码",
      dataIndex: "sku",
      width: 150,
      render: (value) => (
        <span className="font-mono text-xs text-muted-foreground">{value}</span>
      ),
    },
    {
      title: (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span>价格区间</span>
          <Select
            aria-label="价格展示币种"
            value={priceCurrency}
            onChange={setPriceCurrency}
            size="small"
            variant="borderless"
            popupMatchSelectWidth={false}
            className="w-[76px] text-xs"
            options={currencyConfig.currencies.filter(item => item.enabled).map(item => ({ value: item.code, label: item.code }))}
          />
        </div>
      ),
      width: 190,
      render: (_, product) => {
        const price = displayProductPrice(product, priceCurrency, selectedCurrencySymbol);
        return price ? <div><div className="text-sm font-normal tabular-nums text-foreground">{price}</div>{product.variants?.length ? <div className="mt-0.5 text-xs text-muted-foreground">含 {product.variants.length} 个规格</div> : null}</div> : <div><span className="text-sm text-muted-foreground">-</span><div className="mt-0.5 text-xs text-amber-600">未配置该币种</div></div>;
      },
    },
    {
      title: "库存",
      dataIndex: "stock",
      width: 100,
      render: (value) => (
        <span className="text-sm text-foreground">
          {Number(value).toLocaleString()}
        </span>
      ),
    },
    {
      title: "最小起订量",
      dataIndex: "moq",
      width: 120,
      render: (value) => (
        <span className="text-sm text-muted-foreground">{value}</span>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 100,
      render: (value) => <StatusBadge status={value} />,
    },
    createActionColumn<Product>({
      actions: 3,
      minWidth: 140,
      render: (_, product) => (
        <TableActions>
          {can("product.edit") && (
            <TableActionButton
              onClick={() => navigate(`/products/${product.id}/edit`)}
              title="编辑"
              tone="primary"
            >
              <Edit size={15} />
            </TableActionButton>
          )}
          <TableActionButton
            onClick={() => setPreviewProduct(product)}
            title="预览"
            tone="primary"
          >
            <Eye size={15} />
          </TableActionButton>
          {can("product.delete") && (
            <TableActionButton
              onClick={() => setDeleteProduct(product)}
              title="删除"
              tone="danger"
            >
              <Trash2 size={15} />
            </TableActionButton>
          )}
        </TableActions>
      ),
    }),
  ];

  const handleBatchConfirm = async () => {
    if (batchAction === "offline") {
      try {
        await Promise.all(
          selected.map((id) =>
            productApi.update(String(id), { status: "pending" }),
          ),
        );
        setProducts((prev) =>
          prev.map((product) =>
            selected.includes(product.id)
              ? { ...product, status: "pending" }
              : product,
          ),
        );
        setToast({
          message: `已取消同步 ${selected.length} 件商品`,
          type: "success",
        });
      } catch {
        setToast({ message: "批量取消同步失败，请重试", type: "error" });
        return;
      }
    } else if (batchAction === "export") {
      const items = products.filter((product) => selected.includes(product.id));
      downloadCsv(
        `mercivo-products-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          [
            "商品编码",
            "中文名称",
            `价格（${priceCurrency}）`,
            "库存",
            "最小起订量",
            "状态",
          ],
          ...items.map((item) => [
            item.sku,
            item.nameZh,
            displayProductPrice(item, priceCurrency, selectedCurrencySymbol) || "-",
            item.stock,
            item.moq,
            item.status,
          ]),
        ],
      );
      setToast({
        message: `已导出 ${selected.length} 件商品`,
        type: "success",
      });
    }
    setBatchAction(null);
    setSelected([]);
  };

  const handleDeleteConfirm = async () => {
    if (deleteProduct) {
      try {
        await productApi.remove(String(deleteProduct.id));
        pagination.reconcile(Math.max(0, pagination.total - 1));
        setAllProductCount(value => Math.max(0, value - 1));
        setProducts((prev) =>
          prev.filter((product) => product.id !== deleteProduct.id),
        );
        setToast({
          message: `已删除 "${deleteProduct.nameZh}"`,
          type: "success",
        });
      } catch {
        setToast({ message: "删除商品失败，请重试", type: "error" });
        return;
      }
    }
    setDeleteProduct(null);
  };

  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({ message, type });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">商品列表</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            共 {pagination.total} 件商品
          </p>
        </div>
        <div className="flex items-center gap-3">
          {productLimit !== null && (
            <QuotaUsage
              label="商品配额"
              used={allProductCount}
              limit={productLimit}
              onExhaustedClick={() => navigate("/settings?tab=billing")}
            />
          )}
          {can("product.create") && (
            <button
              disabled={productQuotaReached}
              title={
                productQuotaReached
                  ? "商品额度已用完，请升级套餐或联系管理员"
                  : "新建商品"
              }
              onClick={() => navigate("/products/new")}
              className="flex h-9 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-white shadow-sm hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="w-4 h-4" />
              新建商品
            </button>
          )}
        </div>
      </div>

      <div className="grid min-h-[calc(100vh-12rem)] grid-cols-1 items-stretch gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="product-category-sidebar flex h-full min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/60 bg-white/80 shadow-sm backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-border px-4 py-4">
            <div>
              <h2 className="text-sm font-bold text-foreground">商品分类</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {categories.length} 个一级分类
              </p>
            </div>
            {can("product-category.manage") && (
              <button
                onClick={() => navigate("/product-categories")}
                title="管理商品分类"
                className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary hover:bg-primary/20"
              >
                <Plus className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3">
            <button
              data-testid="all-products-category"
              onClick={() => setCategory("all")}
              className={`mb-1 flex h-[31px] w-full items-center justify-between rounded-lg px-3 text-left transition-colors ${category === "all" ? "bg-primary/10 text-primary" : "text-foreground hover:bg-secondary"}`}
            >
              <span className="text-sm font-normal leading-5">全部商品</span>
              <span className="min-w-5 text-right text-xs leading-5 tabular-nums">
                {allProductCount}
              </span>
            </button>
            {categories.length === 0 ? (
              <div className="flex min-h-32 items-center justify-center">
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="暂无商品分类"
                />
              </div>
            ) : (
              <Tree
                blockNode
                defaultExpandAll
                selectedKeys={category === "all" ? [] : [category]}
                treeData={categoryTreeData}
                onSelect={(keys) => setCategory(String(keys[0] || "all"))}
                className="product-category-tree bg-transparent [&_.ant-tree-node-selected]:bg-primary/10! [&_.ant-tree-node-selected]:text-primary!"
              />
            )}
          </div>
        </aside>

        <section className="min-w-0 overflow-hidden rounded-2xl border border-white/60 bg-white shadow-sm">
          {/* Toolbar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <div className="flex-1 max-w-xs">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索商品名称或商品编码..."
                prefix={<Search className="w-4 h-4 text-muted-foreground" />}
                variant="filled"
                size="middle"
              />
            </div>
            <Select
              value={statusFilter}
              onChange={(val) => setStatusFilter(val)}
              style={{ width: 140 }}
              size="middle"
              variant="filled"
              options={[
                { value: "all", label: "全部状态" },
                { value: "published", label: "已同步" },
                { value: "pending", label: "未同步" },
              ]}
            />
            {/* View Toggle */}
            <div className="flex items-center border border-border rounded-xl overflow-hidden ml-auto">
              <button
                aria-label="表格视图"
                onClick={() => setViewMode("table")}
                className={`p-2.5 transition-colors ${viewMode === "table" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
              >
                <List className="w-4 h-4" />
              </button>
              <button
                aria-label="图片视图"
                onClick={() => setViewMode("grid")}
                className={`p-2.5 transition-colors ${viewMode === "grid" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"}`}
              >
                <BarChart2 className="w-4 h-4" />
              </button>
            </div>
            {selected.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  已选 {selected.length} 项
                </span>
                <button
                  onClick={() => setBatchAction("offline")}
                  className="px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-semibold hover:bg-red-100"
                >
                  取消同步
                </button>
                <button
                  onClick={() => setBatchAction("export")}
                  className="px-3 py-1.5 bg-secondary text-foreground border border-border rounded-lg text-xs font-semibold hover:bg-muted"
                >
                  导出
                </button>
              </div>
            )}
          </div>

          {viewMode === "table" ? (
            <AppTable
              loading={loading}
              rowKey="id"
              dataSource={filtered}
              columns={columns}
              scroll={{ x: 1000 }}
              tableLayout="fixed"
              pagination={pagination.config}
              locale={{
                emptyText: (
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无商品数据"
                  />
                ),
              }}
              rowSelection={{
                selectedRowKeys: selected,
                onChange: (keys) => setSelected(keys as Array<Product["id"]>),
              }}
              onRow={() => ({ className: "group" })}
            />
          ) : (
            <div className="grid grid-cols-3 gap-4 p-5">
              {filtered.length === 0 && (
                <div className="col-span-3 flex min-h-72 items-center justify-center bg-white">
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无商品数据"
                  />
                </div>
              )}
              {gridProducts.map((product) => (
                <div
                  key={product.id}
                  className="group border border-border rounded-2xl overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all cursor-pointer"
                  onClick={() => setPreviewProduct(product)}
                >
                  <div className="relative">
                    <ProductImage
                      image={product.img}
                      width={400}
                      height={200}
                      alt={product.nameZh || '-'}
                      className="h-36 w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/products/${product.id}/edit`);
                        }}
                        className="p-2 bg-white rounded-xl shadow text-foreground hover:bg-primary hover:text-white transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewProduct(product);
                        }}
                        className="p-2 bg-white rounded-xl shadow text-foreground hover:bg-primary hover:text-white transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      {product.hot && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full font-bold">
                          热销
                        </span>
                      )}
                      <StatusBadge status={product.status} />
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="text-sm text-foreground">
                      {product.nameZh}
                    </div>
                    <div className="flex items-center justify-between">
                      {displayProductPrice(product, priceCurrency, selectedCurrencySymbol)
                        ? <span className="text-sm font-medium tabular-nums text-primary">{displayProductPrice(product, priceCurrency, selectedCurrencySymbol)}</span>
                        : <span className="text-xs text-amber-600">{priceCurrency} 未配置</span>}
                      <span className="text-xs text-muted-foreground">
                        最小起订量 {product.moq}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      {product.sku} · 库存 {product.stock.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {viewMode === "grid" && filtered.length > 0 && (
            <div className="product-grid-pagination flex items-center justify-end border-t border-border py-3.5">
              <Pagination
                {...pagination.config}
              />
            </div>
          )}
        </section>
      </div>

      {/* Modals */}
      {previewProduct && (
        <ProductPreviewModal
          product={previewProduct}
          categoryName={categoryLabel(previewProduct.category)}
          currency={priceCurrency}
          currencySymbol={selectedCurrencySymbol}
          onClose={() => setPreviewProduct(null)}
          onEdit={() => {
            setPreviewProduct(null);
            navigate(`/products/${previewProduct.id}/edit`);
          }}
        />
      )}
      {deleteProduct && (
        <DeleteConfirmModal
          product={deleteProduct}
          onClose={() => setDeleteProduct(null)}
          onConfirm={handleDeleteConfirm}
        />
      )}
      {batchAction && (
        <BatchConfirmModal
          count={selected.length}
          action={batchAction}
          onClose={() => setBatchAction(null)}
          onConfirm={handleBatchConfirm}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default ProductsPage;
