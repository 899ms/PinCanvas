import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useCallback } from 'react';
import { useCanvas } from '@/store/canvas';
import type { NodeId, TextNodeNode } from '@/types/node';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

export function TextNodeComp({ id, selected }: NodeProps) {
  const node = useCanvas(
    (s) => s.nodes.find((n) => n.id === (id as NodeId)) as TextNodeNode | undefined,
  );
  const patchSettings = useCanvas((s) => s.patchSettings);

  const onChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      patchSettings<'text-node'>(id as NodeId, { text: e.target.value });
    },
    [id, patchSettings],
  );

  if (!node || node.kind !== 'text-node') return null;

  return (
    <div className={frameClass(selected)}>
      <Handle type="source" position={Position.Right} />
      <div className={NODE_HEADER}>
        <span>文本</span>
      </div>
      <div className={NODE_BODY}>
        <textarea
          className="nodrag h-full w-full resize-none border-0 bg-transparent px-2 py-1.5 text-sm text-zinc-800 outline-none placeholder:text-zinc-400"
          placeholder="输入文本 / 提示词…"
          value={node.settings.text}
          onChange={onChange}
        />
      </div>
    </div>
  );
}
