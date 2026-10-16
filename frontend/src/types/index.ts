export interface Product {
  id: string | number;
  nameZh: string;
  sku: string;
  price: string;
  basePrice?: number;
  levelPrices?: Record<string, number>;
  currencyPrices?: Record<string, { basePrice: number; levelPrices: Record<string, number> }>;
  variants?: Array<{ id?: string; specification: string; option: string; stock: number; surcharge: number; surcharges?: Record<string, number> }>;
  tags?: string[];
  stock: number;
  moq: number;
  status: 'published' | 'pending';
  category: string;
  img: string;
  hot: boolean;
  badge?: '' | 'new' | 'hot' | 'bestseller' | 'recommended';
  likeCount?: number;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCategoryChild {
  code: string;
  label: string;
  sort: number;
  status: string;
  remark: string;
}

export interface ProductCategory extends ProductCategoryChild {
  children: ProductCategoryChild[];
}
