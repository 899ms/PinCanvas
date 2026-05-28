import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useCanvas } from '@/store/canvas';
import type { NodeId, PreviewNode as PreviewNodeT } from '@/types/node';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

export function PreviewNodeComp({ id, selected }: NodeProps) {
  const node = useCanvas(
    (s) => s.nodes.find((n) => n.id === (id as NodeId)) as PreviewNodeT | undefined,
  );
  if (!node || node.kind !== 'preview') return null;

  const url = node.settings.content;
  const isVideo = node.settings.previewType === 'video';

  return (
    <div className={frameClass(selected)}>
      <Handle type="target" position={Position.Left} />
      <div className={NODE_HEADER}>
        <span>预览</span>
      </div>
      <div className={`${NODE_BODY} flex items-center justify-center bg-zinc-50`}>
        {!url ? (
          <span className="text-xs text-zinc-400">未连接上游</span>
        ) : isVideo ? (
          <video src={url} controls className="h-full w-full object-contain" />
        ) : (
          <img src={url} alt="" className="h-full w-full object-contain" draggable={false} />
        )}
      </div>
    </div>
  );
}
