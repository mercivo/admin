import React from "react";
import type { Product } from "../../types";
import { ProductImage } from "./ProductImage";

interface ProductTableCellProps {
  product: Product;
  categoryName: string;
}

/** Shared product identity cell used by ERP and storefront product tables. */
export const ProductTableCell: React.FC<ProductTableCellProps> = ({ product, categoryName }) => {
  const badge = ({ new: "新品", hot: "爆品", bestseller: "热销", recommended: "推荐" } as Record<string, string>)[product.badge || ""] || (product.hot ? "爆品" : "");
  return (
  <div className="flex w-[300px] max-w-full min-w-0 items-center gap-3">
    <div className="relative shrink-0">
      <ProductImage image={product.img} width={64} height={64} alt={product.nameZh || '-'} className="h-14 w-14 rounded-xl object-cover" />
      {product.hot && <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">🔥</span>}
    </div>
    <div className="min-w-0 flex-1">
      <div className="truncate text-sm text-foreground">{product.nameZh || "-"}</div>
      <div className="mt-1 flex min-w-0 items-center gap-1.5 overflow-hidden">
        <span title={categoryName || "-"} className="inline-block max-w-[78px] shrink-0 truncate rounded bg-primary/10 px-1.5 py-0.5 text-center text-[10px] text-primary">{categoryName || "-"}</span>
        {badge && <span title={badge} className="inline-block max-w-[48px] shrink-0 truncate rounded bg-amber-50 px-1.5 py-0.5 text-center text-[10px] text-amber-700">{badge}</span>}
        {(product.tags || []).slice(0, 2).map(tag => <span key={tag} title={tag} className="inline-block max-w-[58px] shrink-0 truncate rounded bg-secondary px-1.5 py-0.5 text-center text-[10px] text-muted-foreground">{tag}</span>)}
      </div>
    </div>
  </div>
  );
};
