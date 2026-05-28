import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Loader2, Play, Sparkles } from 'lucide-react';
import { normalizeImageModelId } from '@/api/upstream';
import { useGenerationTrigger } from '@/hooks/useGenerationTrigger';
import { useModels } from '@/hooks/useModels';
import { useUpstream } from '@/hooks/useUpstream';
import { useCanvas } from '@/store/canvas';
import { useNodeTask } from '@/store/tasks';
import type { GenImageNode as GenImageNodeT, NodeId } from '@/types/node';

const RATIO_OPTIONS = ['1:1', '16:9', '9:16', '4:3', '3:4', '21:9'];
const COUNT_OPTIONS = [1, 2, 4, 9];
const DEFAULT_SIZE = { width: 1024, height: 1024 };

export function GenImageNodeComp({ id, selected }: NodeProps) {
  const nid = id as NodeId;
  const IMAGE_MODELS = useModels('image');
  const node = useCanvas((s) => s.nodes.find((n) => n.id === nid) as GenImageNodeT | undefined);
  const patchSettings = useCanvas((s) => s.patchSettings);
  const upstream = useUpstream(nid);
  const task = useNodeTask(nid);
  const trigger = useGenerationTrigger();

  if (!node || node.kind !== 'gen-image') return null;
  const { settings } = node;
  const isBusy = task?.status === 'pending' || task?.status === 'running';
  const refs = upstream.referenceImages;
  const normalizedModel = normalizeImageModelId(settings.model);
  const isCompleted = task?.status === 'completed' && !!node.content;
  const parsedSize = parseSize(settings.resolution);
  const imageWidth = settings.width ?? parsedSize.width ?? DEFAULT_SIZE.width;
  const imageHeight = settings.height ?? parsedSize.height ?? DEFAULT_SIZE.height;
  const commitSize = () => {
    const width = clampDimension(Number(imageWidth), DEFAULT_SIZE.width);
    const height = clampDimension(Number(imageHeight), DEFAULT_SIZE.height);
    patchSettings<'gen-image'>(nid, {
      width,
      height,
      resolution: `${width}x${height}`,
    });
  };

  return (
    <div
      className={`relative flex h-full w-full flex-col rounded-xl border bg-white shadow-lg shadow-zinc-200/70 transition-colors ${
        selected ? 'border-blue-500' : 'border-zinc-200'
      }`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !border-2 !border-zinc-600 !bg-zinc-500"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !border-2 !border-zinc-600 !bg-zinc-700"
      />

      <div className="flex shrink-0 items-center gap-2 px-3 pb-2.5 pt-3">
        <Sparkles className="h-4 w-4 text-blue-500" />
        <span className="text-sm font-semibold leading-5 text-zinc-800">AI 绘图</span>
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3">
        <textarea
          className="nodrag min-h-0 flex-1 resize-none rounded-lg border border-zinc-200 bg-zinc-50/30 px-3 py-2.5 text-sm leading-5 text-zinc-800 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-300 focus:bg-white"
          placeholder={upstream.prompt ? `上游提示词：${upstream.prompt}` : '输入提示词...'}
          value={settings.prompt}
          onChange={(e) => patchSettings<'gen-image'>(nid, { prompt: e.target.value })}
          disabled={isBusy}
        />

        <div className="mt-2.5 min-h-[40px] shrink-0">
          {isBusy && (
            <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-600">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span>生成中...完成后可在生成历史中查看。</span>
            </div>
          )}
          {isCompleted && !isBusy && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700">
              生成完成，结果已保存到生成历史。
            </div>
          )}
          {refs.length > 0 && !isBusy && !isCompleted && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs font-medium text-zinc-500">
              已连接参考图 {refs.length}/5。
            </div>
          )}
          {task?.error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {task.error}
            </div>
          )}
        </div>

        <div className="mt-2.5 grid shrink-0 grid-cols-[minmax(0,1fr)_auto] gap-2 border-t border-zinc-200 pt-2.5">
          <div className="nodrag col-span-2 flex min-w-0 items-center gap-2 rounded-md border border-zinc-200 bg-zinc-50 px-2.5 py-2">
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-zinc-400" />
            <select
              className="min-w-0 flex-1 bg-transparent text-[13px] font-semibold text-zinc-700 outline-none"
              value={normalizedModel}
              onChange={(e) => patchSettings<'gen-image'>(nid, { model: e.target.value })}
              disabled={isBusy}
              title={normalizedModel}
            >
              {IMAGE_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex min-w-0 gap-2">
            <select
              className="nodrag h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 text-xs font-medium text-zinc-700 outline-none hover:bg-white"
              value={settings.ratio ?? '1:1'}
              onChange={(e) => patchSettings<'gen-image'>(nid, { ratio: e.target.value })}
              disabled={isBusy}
            >
              {RATIO_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={64}
              max={4096}
              step={8}
              className="nodrag h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 text-xs font-medium text-zinc-700 outline-none hover:bg-white"
              value={imageWidth}
              onChange={(e) =>
                patchSettings<'gen-image'>(nid, { width: toSizeDraft(e.target.value) })
              }
              onBlur={commitSize}
              disabled={isBusy}
              aria-label="图片宽度"
              title="图片宽度"
            />
            <input
              type="number"
              min={64}
              max={4096}
              step={8}
              className="nodrag h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 text-xs font-medium text-zinc-700 outline-none hover:bg-white"
              value={imageHeight}
              onChange={(e) =>
                patchSettings<'gen-image'>(nid, { height: toSizeDraft(e.target.value) })
              }
              onBlur={commitSize}
              disabled={isBusy}
              aria-label="图片高度"
              title="图片高度"
            />
            <select
              className="nodrag h-9 min-w-0 flex-1 rounded-md border border-zinc-200 bg-zinc-50 px-2 text-xs font-medium text-zinc-700 outline-none hover:bg-white"
              value={settings.count ?? 1}
              onChange={(e) => patchSettings<'gen-image'>(nid, { count: Number(e.target.value) })}
              disabled={isBusy}
            >
              {COUNT_OPTIONS.map((count) => (
                <option key={count} value={count}>
                  {count}张
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            className="nodrag flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
            disabled={isBusy}
            onClick={() => trigger(nid)}
            title={isBusy ? '生成中' : '生成'}
            aria-label={isBusy ? '生成中' : '生成'}
          >
            <Play className="h-4 w-4 fill-current" />
          </button>
        </div>
      </div>
    </div>
  );
}

function parseSize(size: string | undefined): { width?: number; height?: number } {
  const match = size?.match(/^(\d+)x(\d+)$/);
  if (!match) return {};
  return {
    width: Number(match[1]),
    height: Number(match[2]),
  };
}

function toSizeDraft(value: string): number | '' {
  return value === '' ? '' : Number(value);
}

function clampDimension(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(4096, Math.max(64, Math.round(value)));
}
