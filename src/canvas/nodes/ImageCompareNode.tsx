import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Download, Images } from 'lucide-react';
import { useState } from 'react';
import { ImageLightbox } from '@/components/ImageLightbox';
import { useUpstream } from '@/hooks/useUpstream';
import { useCanvas } from '@/store/canvas';
import type { ImageCompareNode as ImageCompareNodeT, NodeId } from '@/types/node';
import { setHistoryImageDragData } from '@/utils/drag';
import { downloadUrl, imageFilename } from '@/utils/image';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

export function ImageCompareNodeComp({ id, selected }: NodeProps) {
  const nid = id as NodeId;
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const node = useCanvas((s) => s.nodes.find((n) => n.id === nid) as ImageCompareNodeT | undefined);
  const upstream = useUpstream(nid);
  if (!node || node.kind !== 'image-compare') return null;

  const images = node.settings.images.length > 0 ? node.settings.images : upstream.referenceImages;

  return (
    <div className={frameClass(selected)}>
      <ImageLightbox imageUrl={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className={NODE_HEADER}>
        <span className="flex items-center gap-1.5">
          <Images className="h-3.5 w-3.5 text-blue-500" />
          图片对比
        </span>
        {images.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-[11px] font-medium text-zinc-400">{images.length} 张</span>
            <button
              type="button"
              className="nodrag flex items-center gap-1 rounded border border-zinc-200 px-1.5 py-0.5 text-[11px] font-medium text-zinc-600 hover:bg-zinc-50"
              onClick={(event) => {
                event.stopPropagation();
                void downloadAllImages(images);
              }}
              title="下载全部图片"
            >
              <Download className="h-3 w-3" />
              全部
            </button>
          </div>
        )}
      </div>
      <div className={`${NODE_BODY} overflow-hidden bg-zinc-50 p-2`}>
        {images.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-zinc-400">
            未连接图片结果
          </div>
        ) : (
          <div className="grid h-full grid-cols-2 gap-2 overflow-y-auto">
            {images.map((url, index) => (
              <button
                key={`${url}-${index}`}
                type="button"
                draggable
                className="nodrag group relative flex aspect-square min-h-0 items-center justify-center overflow-hidden rounded-md border border-zinc-200 bg-white"
                title="拖到 AI 绘图作为参考图，点击查看大图"
                onClick={() => setLightboxUrl(url)}
                onDragStart={(event) => {
                  setHistoryImageDragData(event.dataTransfer, {
                    url,
                    filename: `compare-${index + 1}.png`,
                  });
                }}
              >
                <img
                  src={url}
                  alt={`结果 ${index + 1}`}
                  className="h-full w-full object-contain"
                  draggable={false}
                />
                <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-black/60 px-1.5 py-1 text-center text-[10px] font-medium text-white transition-transform group-hover:translate-y-0">
                  点击查看，拖动引用
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

async function downloadAllImages(images: string[]): Promise<void> {
  for (const [index, url] of images.entries()) {
    await downloadUrl(url, imageFilename('compare', index));
  }
}
