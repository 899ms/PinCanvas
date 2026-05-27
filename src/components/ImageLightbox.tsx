import { Download, X } from 'lucide-react';
import { useEffect } from 'react';
import { downloadUrl, imageFilename } from '@/utils/image';

interface Props {
  imageUrl: string | null;
  onClose: () => void;
}

export function ImageLightbox({ imageUrl, onClose }: Props) {
  useEffect(() => {
    if (!imageUrl) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [imageUrl, onClose]);

  if (!imageUrl) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/70 p-6"
      role="dialog"
      aria-modal="true"
      onMouseDown={onClose}
    >
      <button
        type="button"
        className="absolute right-5 top-5 rounded-full bg-white/95 p-2 text-zinc-700 shadow-lg hover:bg-white"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={onClose}
        aria-label="关闭大图"
      >
        <X className="h-5 w-5" />
      </button>
      <button
        type="button"
        className="absolute right-16 top-5 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-2 text-xs font-semibold text-zinc-700 shadow-lg hover:bg-white"
        onMouseDown={(event) => event.stopPropagation()}
        onClick={() => void downloadUrl(imageUrl, imageFilename('image'))}
        aria-label="下载当前图片"
        title="下载当前图片"
      >
        <Download className="h-4 w-4" />
        下载
      </button>
      <img
        src={imageUrl}
        alt=""
        className="max-h-full max-w-full rounded-lg bg-white object-contain shadow-2xl"
        draggable={false}
        onMouseDown={(event) => event.stopPropagation()}
      />
    </div>
  );
}
