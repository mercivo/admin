import React, { useEffect, useMemo, useState } from 'react';
import { ProductImage } from './ProductImage';

interface ProductGalleryProps { images?: string[] | null; fallbackImage?: string | null; alt?: string; className?: string; }

export const ProductGallery: React.FC<ProductGalleryProps> = ({ images, fallbackImage, alt = '商品图片', className = '' }) => {
  const gallery = useMemo(() => {
    const values = images?.length ? images : fallbackImage ? [fallbackImage] : [];
    return [...new Set(values.map(value => value.trim()).filter(Boolean))].slice(0, 10);
  }, [images, fallbackImage]);
  const [active, setActive] = useState(0);
  useEffect(() => setActive(0), [gallery.join('\n')]);
  return <div className={className}>
    <div className="grid aspect-square place-items-center overflow-hidden rounded-2xl border border-border bg-white"><ProductImage image={gallery[active]} width={720} height={720} alt={alt} className="h-full w-full bg-white" /></div>
    {gallery.length > 1 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="商品图片缩略图">{gallery.map((image, index) => <button type="button" key={`${image}-${index}`} aria-label={`查看第 ${index + 1} 张商品图片`} aria-pressed={index === active} onClick={() => setActive(index)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white transition-colors ${index === active ? 'border-primary' : 'border-border hover:border-primary/50'}`}><ProductImage image={image} width={128} height={128} alt={`${alt} ${index + 1}`} className="h-full w-full bg-white" /></button>)}</div>}
  </div>;
};
