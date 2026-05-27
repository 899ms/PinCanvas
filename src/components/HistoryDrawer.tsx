import { Loader2, RefreshCw, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ImageLightbox } from '@/components/ImageLightbox';
import { useCanvas } from '@/store/canvas';
import { useHistory, type HistoryEntry } from '@/store/history';
import type { NodeId } from '@/types/node';
import { setHistoryImageDragData } from '@/utils/drag';

interface Props {
  onClose: () => void;
}

export function HistoryDrawer({ onClose }: Props) {
  const entries = useHistory((s) => s.entries);
  const remove = useHistory((s) => s.remove);
  const clear = useHistory((s) => s.clear);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <aside className="flex h-full min-w-0 flex-col overflow-hidden bg-white">
      <div className="sticky top-0 z-10 flex h-[76px] items-center justify-between border-b border-zinc-200 bg-white px-5">
        <div className="flex items-center gap-3 text-zinc-800">
          <span className="text-[15px] font-semibold leading-5 text-zinc-900">生成历史</span>
          <span className="text-[13px] font-medium text-zinc-500">
            {entries.length}/100
          </span>
        </div>
        <div className="flex items-center gap-1">
          {entries.length > 0 && (
            <button
              type="button"
              className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100"
              onClick={() => {
                if (window.confirm('清空全部历史记录？')) void clear();
              }}
              title="清空"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            className="rounded p-1.5 text-zinc-500 hover:bg-zinc-100"
            onClick={onClose}
            aria-label="关闭"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="border-b border-red-100 bg-red-50 px-5 py-3 text-[13px] font-medium text-red-500">
        本地缓存未连接
      </div>
      <div className="flex items-center gap-3 px-5 py-4 text-[13px] font-semibold text-zinc-400">
        <span className="h-px flex-1 bg-zinc-200" />
        之前生成 ({entries.length})
        <span className="h-px flex-1 bg-zinc-200" />
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-5">
        {entries.length === 0 ? (
          <div className="mt-8 text-center text-[13px] font-medium leading-6 text-zinc-400">
            暂无生成记录。
            <br />
            图片 / 视频生成完成后会自动出现在这里。
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((e) => (
              <HistoryCard key={e.id} entry={e} onRemove={() => void remove(e.id)} />
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

interface CardProps {
  entry: HistoryEntry;
  onRemove: () => void;
}

function HistoryCard({ entry, onRemove }: CardProps) {
  const patchNode = useCanvas((s) => s.patchNode);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const time = new Date(entry.timestamp);
  const timeStr = `${pad(time.getHours())}:${pad(time.getMinutes())}`;
  const isVideo = entry.kind === 'video';
  const isPending = entry.status === 'pending';
  const isError = entry.status === 'failed' || !!entry.error;
  const imageUrls = entry.contents?.length ? entry.contents : entry.content ? [entry.content] : [];

  const onImageDragStart = (event: React.DragEvent, url: string, index = 0) => {
    setHistoryImageDragData(event.dataTransfer, {
      url,
      filename: `${entry.id}-${index + 1}.png`,
    });
  };

  const reuse = () => {
    if (!entry.content) return;
    // 把内容回填到当前活节点（如果还存在）
    const node = useCanvas.getState().nodes.find((n) => n.id === entry.nodeId);
    if (node) {
      patchNode(entry.nodeId as NodeId, {
        content: entry.content,
        generatedImages: entry.contents,
      });
    } else {
      window.alert('原节点已被删除，无法直接回填。可右键复制 URL。');
    }
  };

  return (
    <li className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
      <ImageLightbox imageUrl={lightboxUrl} onClose={() => setLightboxUrl(null)} />
      {isPending && (
        <div className="flex h-36 items-center justify-center bg-zinc-50">
          <div className="flex flex-col items-center gap-2 text-xs font-medium text-blue-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>生成中...</span>
          </div>
        </div>
      )}
      {entry.content && !isError && !isPending && (
        <div className="border-b border-zinc-100 bg-zinc-50 p-2">
          {isVideo ? (
            <video
              src={entry.content}
              className="block aspect-video w-full rounded-md bg-black object-contain"
            />
          ) : imageUrls.length > 1 ? (
            <div>
              <div className="mb-1.5 text-[10px] font-medium text-zinc-400">
                双击图片查看大图
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {imageUrls.slice(0, 9).map((url, i) => (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    className="group relative overflow-hidden rounded-md text-left"
                    draggable
                    onDragStart={(event) => onImageDragStart(event, url, i)}
                    onDoubleClick={() => setLightboxUrl(url)}
                    title="拖到 AI 绘图作为参考图，双击查看大图"
                  >
                    <img
                      src={url}
                      alt=""
                      className="aspect-square w-full object-cover"
                      draggable={false}
                    />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-black/60 px-1.5 py-1 text-center text-[10px] font-medium text-white transition-transform group-hover:translate-y-0">
                      双击查看大图
                    </span>
                    {i === 8 && imageUrls.length > 9 && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45 text-xs font-semibold text-white">
                        +{imageUrls.length - 9}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="group relative block w-full overflow-hidden rounded-md"
              draggable
              onDragStart={(event) => {
                if (entry.content) onImageDragStart(event, entry.content);
              }}
              onDoubleClick={() => setLightboxUrl(entry.content ?? null)}
              title="拖到 AI 绘图作为参考图，双击查看大图"
            >
              <img
                src={entry.content}
                alt=""
                className="mx-auto block aspect-video max-h-40 w-full object-contain"
                draggable={false}
              />
              <span className="pointer-events-none absolute inset-x-0 bottom-0 translate-y-full bg-black/60 px-1.5 py-1 text-center text-[10px] font-medium text-white transition-transform group-hover:translate-y-0">
                双击查看大图
              </span>
            </button>
          )}
        </div>
      )}
      <div className="flex flex-col gap-1 px-2 py-2">
        <div className="flex items-start justify-between gap-2">
          <p className="line-clamp-2 flex-1 text-xs font-medium leading-5 text-zinc-800">
            {entry.prompt || (isError ? '(失败)' : '(无 prompt)')}
          </p>
          <div className="flex shrink-0 gap-0.5">
            <button
              type="button"
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              onClick={reuse}
              title="回填到原节点"
              disabled={!entry.content || isPending}
            >
              <RefreshCw className="h-3 w-3" />
            </button>
            <button
              type="button"
              className="rounded p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
              onClick={onRemove}
              title="删除"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-1.5 text-[10px] text-zinc-400">
          {entry.sizeDesc && <span>{entry.sizeDesc}</span>}
          {entry.refsCount != null && entry.refsCount > 0 && (
            <span>· refs {entry.refsCount}</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-zinc-400">
          <span>{timeStr}</span>
          <span>·</span>
          <span>{entry.model}</span>
          {entry.durationMs != null && (
            <>
              <span>·</span>
              <span>用时 {Math.round(entry.durationMs / 100) / 10}s</span>
            </>
          )}
          {isPending && (
            <>
              <span>·</span>
              <span className="font-medium text-blue-500">生成中...</span>
            </>
          )}
        </div>
        {isError && (
          <div className="rounded bg-red-50 px-1.5 py-1 text-[10px] text-red-700">
            {entry.error}
          </div>
        )}
      </div>
    </li>
  );
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}
