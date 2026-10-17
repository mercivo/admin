import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Expand } from 'lucide-react';
import { AppModal } from './AppModal';
import { ProductImage } from './ProductImage';

interface ProductImagePreviewProps {
  images?: Array<string | null | undefined> | null;
  initialIndex?: number;
  alt?: string;
  width: number;
  height: number;
  className?: string;
  buttonClassName?: string;
  showHint?: boolean;
}

const normalizedImages = (images?: Array<string | null | undefined> | null) =>
  [...new Set((images || []).map(image => image?.trim()).filter((image): image is string => Boolean(image)))].slice(0, 10);

/** Shared clickable product image and full-image lightbox used by upload, list and gallery views. */
export const ProductImagePreview: React.FC<ProductImagePreviewProps> = ({
  images,
  initialIndex = 0,
  alt = '商品图片',
  width,
  height,
  className = '',
  buttonClassName = '',
  showHint = true,
}) => {
  const gallery = useMemo(() => normalizedImages(images), [images]);
  const safeIndex = Math.min(Math.max(initialIndex, 0), Math.max(gallery.length - 1, 0));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(safeIndex);
  const openPreview = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    if (!gallery.length) return;
    setActive(safeIndex);
    setOpen(true);
  };
  const select = (index: number) => setActive((index + gallery.length) % gallery.length);

  return <>
    <button type="button" onClick={openPreview} disabled={!gallery.length} aria-label={gallery.length ? `预览${alt}` : `${alt}不可预览`} className={`group relative block overflow-hidden bg-white disabled:cursor-default ${buttonClassName}`}>
      <ProductImage image={gallery[safeIndex]} width={width} height={height} alt={alt} className={className} />
      {showHint && gallery.length > 0 && <span className="absolute bottom-2 right-2 grid h-7 w-7 place-items-center rounded-full bg-black/55 text-white opacity-0 shadow transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden="true"><Expand className="h-3.5 w-3.5" /></span>}
    </button>
    <AppModal open={open} title={alt} onCancel={() => setOpen(false)} footer={null} width="min(94vw, 1100px)" className="product-image-preview-modal" styles={{ body: { maxHeight: 'calc(100vh - 150px)', overflow: 'hidden', padding: 0 } }}>
      <div className="relative flex h-[calc(100vh-170px)] min-h-[320px] max-h-[820px] items-center justify-center overflow-hidden bg-white px-14 py-6">
        <ProductImage image={gallery[active]} width={1600} height={1600} alt={`${alt} ${active + 1}`} className="h-full w-full object-contain" />
        {gallery.length > 1 && <>
          <button type="button" aria-label="上一张商品图片" onClick={() => select(active - 1)} className="absolute left-3 grid h-10 w-10 place-items-center rounded-full border border-border bg-white/95 text-foreground shadow hover:bg-secondary"><ChevronLeft className="h-5 w-5" /></button>
          <button type="button" aria-label="下一张商品图片" onClick={() => select(active + 1)} className="absolute right-3 grid h-10 w-10 place-items-center rounded-full border border-border bg-white/95 text-foreground shadow hover:bg-secondary"><ChevronRight className="h-5 w-5" /></button>
          <span className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">{active + 1} / {gallery.length}</span>
        </>}
      </div>
    </AppModal>
  </>;
};
