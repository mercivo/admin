import type { Product } from '../../types';

export const productBadgeLabels: Record<NonNullable<Product['badge']>, string> = {
  '': '',
  new: '新品',
  hot: '爆品',
  bestseller: '热销',
  recommended: '推荐',
};

export const productBadgeLabel = (product: Pick<Product, 'badge' | 'hot'>) =>
  productBadgeLabels[product.badge || ''] || (product.hot ? productBadgeLabels.hot : '');
