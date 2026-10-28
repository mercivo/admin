export type StorefrontMetadata = {
  title: string;
  description: string;
  keywords: string;
  siteName: string;
  productName: string;
  canonical: string;
  image: string;
  faviconUrl: string;
  robots: string;
};

export function resolveStorefrontMetadata(input: {
  data: any;
  locale: string;
  product?: any;
  canonical: string;
}): StorefrontMetadata;
