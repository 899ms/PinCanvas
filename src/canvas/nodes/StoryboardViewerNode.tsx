import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Film, Image as ImageIcon } from 'lucide-react';
import { useUpstream } from '@/hooks/useUpstream';
import { useCanvas } from '@/store/canvas';
import type { NodeId, StoryboardViewerNode as ViewerNodeT } from '@/types/node';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

export function StoryboardViewerNodeComp({ id, selected }: NodeProps) {
  const nid = id as NodeId;
  const node = useCanvas(
    (s) => s.nodes.find((n) => n.id === nid) as ViewerNodeT | undefined,
  );
  const upstream = useUpstream(nid);

  if (!node || node.kind !== 'storyboard-viewer') return null;

  // 优先使用上游数据，如果没有则使用节点自身的数据
  const shots = upstream.shots.length > 0 ? upstream.shots : node.settings.shots;
  const hasData = shots.length > 0;

  return (
    <div className={frameClass(selected)} style={{ width: 500 }}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className={NODE_HEADER}>
        <Film className="h-3 w-3" />
        <span>分镜展示</span>
        <span className="ml-auto text-zinc-400">{shots.length} shots</span>
      </div>
      <div className={`${NODE_BODY} flex flex-col gap-2 overflow-y-auto px-2 py-2`}>
        {!hasData && (
          <div className="rounded border border-dashed border-zinc-300 px-3 py-6 text-center text-xs text-zinc-500">
            连接一个"剧本转分镜"节点以查看分镜
          </div>
        )}

        {shots.map((shot, i) => (
          <div
            key={shot.id}
            className="flex flex-col gap-1.5 rounded border border-zinc-200 bg-white p-2"
          >
            {/* 标题行 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-zinc-700">Shot #{i + 1}</span>
              {shot.scene && (
                <span className="text-[10px] text-zinc-500">{shot.scene}</span>
              )}
              {shot.duration && (
                <span className="ml-auto text-[10px] text-zinc-400">{shot.duration}s</span>
              )}
            </div>

            {/* 首尾帧展示 */}
            <div className="flex gap-2">
              {/* 首帧 */}
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-1">
                  <ImageIcon className="h-2.5 w-2.5 text-zinc-500" />
                  <span className="text-[10px] font-medium text-zinc-600">首帧</span>
                </div>
                {shot.startFrameUrl ? (
                  <img
                    src={shot.startFrameUrl}
                    alt={`Shot ${i + 1} 首帧`}
                    className="h-32 w-full rounded border border-zinc-200 object-cover"
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center rounded border border-dashed border-zinc-300 bg-zinc-50 text-[10px] text-zinc-400">
                    未生成
                  </div>
                )}
                {shot.startFramePrompt && (
                  <div className="max-h-16 overflow-y-auto rounded bg-zinc-50 px-1.5 py-1 text-[9px] text-zinc-600">
                    {shot.startFramePrompt}
                  </div>
                )}
              </div>

              {/* 箭头 */}
              {shot.action && (
                <div className="flex flex-col items-center justify-center gap-1 px-1">
                  <div className="text-zinc-400">→</div>
                  <div className="max-w-[60px] text-center text-[9px] text-zinc-500">
                    {shot.action}
                  </div>
                </div>
              )}

              {/* 尾帧 */}
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-1">
                  <Film className="h-2.5 w-2.5 text-zinc-500" />
                  <span className="text-[10px] font-medium text-zinc-600">尾帧</span>
                </div>
                {shot.endFrameUrl ? (
                  <img
                    src={shot.endFrameUrl}
                    alt={`Shot ${i + 1} 尾帧`}
                    className="h-32 w-full rounded border border-zinc-200 object-cover"
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center rounded border border-dashed border-zinc-300 bg-zinc-50 text-[10px] text-zinc-400">
                    未生成
                  </div>
                )}
                {shot.endFramePrompt && (
                  <div className="max-h-16 overflow-y-auto rounded bg-zinc-50 px-1.5 py-1 text-[9px] text-zinc-600">
                    {shot.endFramePrompt}
                  </div>
                )}
              </div>
            </div>

            {/* 视频预览（如果有） */}
            {shot.videoUrl && (
              <div className="flex flex-col gap-1">
                <div className="text-[10px] font-medium text-zinc-600">生成的视频</div>
                <video
                  src={shot.videoUrl}
                  className="h-40 w-full rounded border border-zinc-200 bg-black object-contain"
                  controls
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
