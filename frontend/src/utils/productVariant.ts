import type { Product } from "../types";

export const productVariantValue = (productId: string, variantKey: string) =>
  `${productId}:${variantKey}`;

export const availableProductVariantValues = (products: Product[]) =>
  new Set(
    products.flatMap((product) =>
      product.variants?.length
        ? product.variants.map((variant) =>
            productVariantValue(String(product.id), variant.id || "BASE"),
          )
        : [productVariantValue(String(product.id), "BASE")],
    ),
  );
