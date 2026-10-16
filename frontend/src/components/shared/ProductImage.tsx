import React, { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';

const LEGACY_IMAGE_ORIGIN = 'https://image.aihubflux.com/';
const GCS_IMAGE_ORIGIN = 'https://storage.googleapis.com/mercivo-images-753805870951/';

export const productImageUrl = (image: string | null | undefined, width: number, height: number) => {
  const value = image?.trim();
  if (!value) return '';
  if (value.startsWith(LEGACY_IMAGE_ORIGIN)) return `${GCS_IMAGE_ORIGIN}${value.slice(LEGACY_IMAGE_ORIGIN.length)}`;
  return /^(?:https?:|data:|blob:|\/)/i.test(value)
    ? value
    : `https://images.unsplash.com/${value}?w=${width}&h=${height}&fit=crop&auto=format`;
};

interface ProductImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  image?: string | null;
  width: number;
  height: number;
  fallbackClassName?: string;
}

export const ProductImage = ({ image, width, height, alt = '商品图片', className = '', fallbackClassName = '', onError, ...props }: ProductImageProps) => {
  const src = productImageUrl(image, width, height);
  const [failed, setFailed] = useState(!src);

  useEffect(() => setFailed(!src), [src]);

  if (failed) {
    return <div role="img" aria-label={`${alt}（默认图）`} className={`flex items-center justify-center bg-secondary text-muted-foreground/50 ${className} ${fallbackClassName}`}><ImageOff className="h-[38%] w-[38%]" strokeWidth={1.5} /></div>;
  }

  return <img {...props} src={src} alt={alt} className={className} onError={event => { setFailed(true); onError?.(event); }} />;
};
