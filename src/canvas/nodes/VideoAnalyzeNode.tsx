import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useGenerationTrigger } from '@/hooks/useGenerationTrigger';
import { useModels } from '@/hooks/useModels';
import { useUpstream } from '@/hooks/useUpstream';
import { useCanvas } from '@/store/canvas';
import { useNodeTask } from '@/store/tasks';
import type { NodeId, VideoAnalyzeNode as VideoAnalyzeNodeT } from '@/types/node';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

export function VideoAnalyzeNodeComp({ id, selected }: NodeProps) {
  const nid = id as NodeId;
  const CHAT_MODELS = useModels('chat');
  const node = useCanvas(
    (s) => s.nodes.find((n) => n.id === nid) as VideoAnalyzeNodeT | undefined,
  );
  const patchSettings = useCanvas((s) => s.patchSettings);
  const upstream = useUpstream(nid);
  const task = useNodeTask(nid);
  const trigger = useGenerationTrigger();

  if (!node || node.kind !== 'video-analyze') return null;
  const { settings } = node;
  const isBusy = task?.status === 'pending' || task?.status === 'running';
  const frames = upstream.videoFrames;

  return (
    <div className={frameClass(selected)}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className={NODE_HEADER}>
        <span>视频分析</span>
        <span className="ml-auto truncate text-zinc-400">{settings.model}</span>
      </div>
      <div className={`${NODE_BODY} flex flex-col gap-1.5 overflow-y-auto px-2 py-1.5`}>
        <select
          className="nodrag rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
          value={settings.model}
          onChange={(e) => patchSettings<'video-analyze'>(nid, { model: e.target.value })}
          disabled={isBusy}
        >
          {CHAT_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id}
            </option>
          ))}
        </select>
        <textarea
          className="nodrag h-12 resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
          placeholder="分析指令（空则用默认：按时间顺序描述视频内容）"
          value={settings.instruction ?? ''}
          onChange={(e) =>
            patchSettings<'video-analyze'>(nid, { instruction: e.target.value })
          }
          disabled={isBusy}
        />
        {frames.length > 0 ? (
          <div className="flex items-center gap-1 overflow-x-auto">
            {frames.slice(0, 6).map((f, i) => (
              <img
                key={`${f.time}-${i}`}
                src={f.url}
                alt=""
                className="h-10 w-10 shrink-0 rounded border border-zinc-200 object-cover"
                draggable={false}
              />
            ))}
            <span className="shrink-0 text-[11px] text-zinc-400">{frames.length} 帧</span>
          </div>
        ) : (
          <div className="rounded border border-dashed border-zinc-300 px-2 py-2 text-center text-[11px] text-zinc-500">
            连一个 video-input 节点并截取关键帧
          </div>
        )}
        {settings.analysisResult && (
          <div className="max-h-32 overflow-y-auto rounded border border-zinc-200 bg-zinc-50 px-1.5 py-1 text-[11px] text-zinc-700 whitespace-pre-wrap">
            {settings.analysisResult}
          </div>
        )}
        {task?.error && (
          <div className="rounded bg-red-50 px-1.5 py-1 text-[11px] text-red-700">
            {task.error}
          </div>
        )}
        <button
          type="button"
          className="nodrag rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
          disabled={isBusy || frames.length === 0}
          onClick={() => trigger(nid)}
        >
          {isBusy ? '分析中…' : '分析视频'}
        </button>
      </div>
    </div>
  );
}
