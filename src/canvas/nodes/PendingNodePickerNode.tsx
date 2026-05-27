import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Check, Film, ImagePlus, Sparkles } from 'lucide-react';
import { useEffect } from 'react';
import { createNode } from '@/canvas/factory';
import {
  FEATURE_DISABLED_MESSAGE,
  isNodeFeatureEnabled,
} from '@/config/features';
import { useCanvas } from '@/store/canvas';
import type {
  ImageCompareNode,
  NodeId,
  NodeKind,
  PendingNodePickerNode as PendingNodePickerNodeT,
} from '@/types/node';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

const OPTIONS: Array<{
  kind: NodeKind;
  label: string;
  description: string;
  Icon: typeof ImagePlus;
}> = [
  {
    kind: 'gen-video',
    label: '视频生成',
    description: '接收上游素材或提示词',
    Icon: Film,
  },
  {
    kind: 'gen-image',
    label: '图片生成',
    description: '生成或编辑图片',
    Icon: ImagePlus,
  },
  {
    kind: 'video-analyze',
    label: '素材理解',
    description: 'AI 调用分析素材',
    Icon: Sparkles,
  },
];

export function PendingNodePickerNodeComp({ id, selected }: NodeProps) {
  const nid = id as NodeId;
  const node = useCanvas(
    (s) => s.nodes.find((n) => n.id === nid) as PendingNodePickerNodeT | undefined,
  );
  const source = useCanvas((s) => getImageCompareSource(s.nodes, s.edges, nid));
  const incomingEdge = useCanvas((s) => s.edges.find((e) => e.to === nid));
  const replaceNode = useCanvas((s) => s.replaceNode);
  const patchEdge = useCanvas((s) => s.patchEdge);
  const setSelection = useCanvas((s) => s.setSelection);

  const selectedUrls = incomingEdge?.referenceImageUrls ?? [];
  const images = source?.settings.images ?? [];
  const needsReferenceChoice = images.length > 0;

  useEffect(() => {
    if (!incomingEdge || !needsReferenceChoice || incomingEdge.referenceImageUrls?.length) return;
    patchEdge(incomingEdge.id, { referenceImageUrls: [images[0]] });
  }, [images, incomingEdge, needsReferenceChoice, patchEdge]);

  if (!node || node.kind !== 'pending-node-picker') return null;

  const toggleReference = (url: string) => {
    if (!incomingEdge) return;
    const next = selectedUrls.includes(url)
      ? selectedUrls.filter((item) => item !== url)
      : [...selectedUrls, url].slice(0, 5);
    patchEdge(incomingEdge.id, { referenceImageUrls: next });
  };

  const choose = (kind: NodeKind) => {
    if (!isNodeFeatureEnabled(kind)) {
      window.alert(FEATURE_DISABLED_MESSAGE);
      return;
    }
    const next = {
      ...createNode(kind, {
        x: node.x,
        y: node.y,
      }),
      id: node.id,
    };
    replaceNode(node.id, next);
    setSelection([node.id]);
  };

  return (
    <div className={frameClass(selected)}>
      <Handle type="target" position={Position.Left} />
      <div className={NODE_HEADER}>
        <span>选择节点类型</span>
        {needsReferenceChoice && (
          <span className="ml-auto text-[11px] text-zinc-400">{selectedUrls.length} / 5</span>
        )}
      </div>
      <div className={`${NODE_BODY} flex flex-col gap-2 overflow-y-auto p-2`}>
        {needsReferenceChoice && (
          <div className="rounded-md border border-blue-100 bg-blue-50/70 p-1.5">
            <div className="mb-1 text-[11px] font-semibold leading-4 text-blue-700">
              选择参考图
            </div>
            <div className="grid grid-cols-4 gap-1.5">
              {images.map((url, index) => {
                const active = selectedUrls.includes(url);
                return (
                  <button
                    key={`${url}-${index}`}
                    type="button"
                    className={`nodrag relative aspect-square overflow-hidden rounded border bg-white ${
                      active ? 'border-blue-500 ring-2 ring-blue-200' : 'border-zinc-200'
                    }`}
                    onClick={() => toggleReference(url)}
                    title={`参考图 ${index + 1}`}
                  >
                    <img
                      src={url}
                      alt={`参考图 ${index + 1}`}
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                    {active && (
                      <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-white">
                        <Check className="h-3 w-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {OPTIONS.map(({ kind, label, description, Icon }) => {
          const disabled = !isNodeFeatureEnabled(kind);
          return (
          <button
            key={kind}
            type="button"
            className="nodrag flex min-h-[44px] items-center gap-2 rounded-md border border-zinc-200 bg-white px-2 text-left hover:border-blue-200 hover:bg-blue-50 active:bg-blue-100 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
            onClick={() => choose(kind)}
            disabled={disabled}
            title={disabled ? FEATURE_DISABLED_MESSAGE : label}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-zinc-100 text-zinc-700">
              <Icon className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-xs font-semibold leading-4 text-zinc-800">
                {label}
                {disabled ? '（即将上线）' : ''}
              </span>
              <span className="block truncate text-[11px] leading-4 text-zinc-400">
                {disabled ? FEATURE_DISABLED_MESSAGE : description}
              </span>
            </span>
          </button>
          );
        })}
      </div>
    </div>
  );
}

function getImageCompareSource(
  nodes: Array<{ id: NodeId; kind: string }>,
  edges: Array<{ from: NodeId; to: NodeId }>,
  nodeId: NodeId,
): ImageCompareNode | null {
  const edge = edges.find((item) => item.to === nodeId);
  const source = edge ? nodes.find((item) => item.id === edge.from) : undefined;
  return source?.kind === 'image-compare' ? (source as ImageCompareNode) : null;
}
