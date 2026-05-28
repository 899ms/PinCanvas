import {
  Background,
  Controls,
  MiniMap,
  NodeResizer,
  ReactFlow,
  type EdgeChange,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeChange,
  type NodeTypes,
  type OnConnect,
  type OnConnectEnd,
  type OnConnectStart,
  type OnNodeDrag,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { X } from 'lucide-react';
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createInputImageFromDataURL, createNode } from '@/canvas/factory';
import {
  FEATURE_DISABLED_MESSAGE,
  isNodeFeatureEnabled,
} from '@/config/features';
import { useCanvas, useTemporal } from '@/store/canvas';
import { getHistoryImageDragData, hasHistoryImageDragData } from '@/utils/drag';
import { fileToDataURL } from '@/utils/image';
import { edgeId } from '@/utils/id';
import type { AppEdge } from '@/types/edge';
import type { AppNode, NodeId, NodeKind } from '@/types/node';
import { AudioInputNodeComp } from './nodes/AudioInputNode';
import { CreateCharacterNodeComp } from './nodes/CreateCharacterNode';
import { CreateSceneNodeComp } from './nodes/CreateSceneNode';
import { ExtractCharactersScenesNodeComp } from './nodes/ExtractCharactersScenesNode';
import { GenerateCharacterVideoNodeComp } from './nodes/GenerateCharacterVideoNode';
import { GenerateSceneVideoNodeComp } from './nodes/GenerateSceneVideoNode';
import { StoryboardNodeComp } from './nodes/StoryboardNode';
import { GenerateCharacterImageNodeComp } from './nodes/GenerateCharacterImageNode';
import { GenerateSceneImageNodeComp } from './nodes/GenerateSceneImageNode';
import { GenImageNodeComp } from './nodes/GenImageNode';
import { GenVideoNodeComp } from './nodes/GenVideoNode';
import { InputImageNodeComp } from './nodes/InputImageNode';
import { ImageCompareNodeComp } from './nodes/ImageCompareNode';
import { PendingNodePickerNodeComp } from './nodes/PendingNodePickerNode';
import { PreviewNodeComp } from './nodes/PreviewNode';
import { TextNodeComp } from './nodes/TextNode';
import { VideoAnalyzeNodeComp } from './nodes/VideoAnalyzeNode';
import { VideoInputNodeComp } from './nodes/VideoInputNode';
import { CharacterCardNodeComp } from './nodes/CharacterCardNode';
import { ScriptToStoryboardNodeComp } from './nodes/ScriptToStoryboardNode';
import { ChatNodeComp } from './nodes/ChatNode';
import { StoryboardViewerNodeComp } from './nodes/StoryboardViewerNode';

function withNodeChrome(Component: ComponentType<any>) {
  return function NodeChrome(props: any) {
    const id = props.id as NodeId;
    const selectedIds = useCanvas((s) => s.selectedIds);
    const node = useCanvas((s) => s.nodes.find((item) => item.id === id));
    const setSelection = useCanvas((s) => s.setSelection);
    const removeNode = useCanvas((s) => s.removeNode);
    const isSelected = props.selected || selectedIds.includes(id);
    const kind = node?.kind ?? (props.type as NodeKind | undefined);
    const featureDisabled = kind ? !isNodeFeatureEnabled(kind) : false;

    return (
      <div
        className="relative h-full w-full"
        onPointerDownCapture={(event) => {
          if (shouldSelectNodeFromPointerDown(event)) setSelection([id]);
        }}
      >
        <NodeResizer
          isVisible={isSelected}
          minWidth={160}
          minHeight={120}
          lineClassName="!border-blue-500"
          handleClassName="!h-2.5 !w-2.5 !border-blue-500 !bg-white"
        />
        <div
          className={`pointer-events-none absolute inset-0 z-10 rounded-xl transition-all ${
            isSelected
              ? 'border border-blue-500 shadow-[0_18px_45px_rgba(37,99,235,0.18)] ring-2 ring-blue-500/20'
              : 'border border-transparent'
          }`}
        />
        <button
          type="button"
          className={`nodrag absolute -right-3 -top-3 z-20 flex h-7 w-7 items-center justify-center rounded-full border bg-white shadow-md transition-all hover:scale-105 hover:text-zinc-700 ${
            isSelected
              ? 'border-blue-200 text-zinc-500 opacity-100'
              : 'pointer-events-none border-zinc-200 text-zinc-400 opacity-0'
          }`}
          onClick={(e) => {
            e.stopPropagation();
            removeNode(id);
          }}
          aria-label="删除节点"
          title="删除节点"
        >
          <X className="h-4 w-4" />
        </button>
        <Component {...props} selected={isSelected} />
        {featureDisabled && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-white/85 px-4 text-center text-sm font-semibold text-zinc-700 backdrop-blur-[1px]">
            {FEATURE_DISABLED_MESSAGE}
          </div>
        )}
      </div>
    );
  };
}

function shouldSelectNodeFromPointerDown(event: React.PointerEvent<HTMLElement>): boolean {
  const target = event.target;
  if (!(target instanceof Element)) return true;
  return !target.closest('.react-flow__handle, .react-flow__resize-control');
}

const nodeTypes: NodeTypes = {
  'input-image': withNodeChrome(InputImageNodeComp),
  'audio-input': withNodeChrome(AudioInputNodeComp),
  preview: withNodeChrome(PreviewNodeComp),
  'image-compare': withNodeChrome(ImageCompareNodeComp),
  'text-node': withNodeChrome(TextNodeComp),
  'gen-image': withNodeChrome(GenImageNodeComp),
  'video-input': withNodeChrome(VideoInputNodeComp),
  'gen-video': withNodeChrome(GenVideoNodeComp),
  'video-analyze': withNodeChrome(VideoAnalyzeNodeComp),
  'pending-node-picker': withNodeChrome(PendingNodePickerNodeComp),
  'create-character': withNodeChrome(CreateCharacterNodeComp),
  'create-scene': withNodeChrome(CreateSceneNodeComp),
  'generate-character-image': withNodeChrome(GenerateCharacterImageNodeComp),
  'generate-scene-image': withNodeChrome(GenerateSceneImageNodeComp),
  'extract-characters-scenes': withNodeChrome(ExtractCharactersScenesNodeComp),
  'storyboard-node': withNodeChrome(StoryboardNodeComp),
  'script-to-storyboard': withNodeChrome(ScriptToStoryboardNodeComp),
  'storyboard-viewer': withNodeChrome(StoryboardViewerNodeComp),
  chat: withNodeChrome(ChatNodeComp),
  'generate-character-video': withNodeChrome(GenerateCharacterVideoNodeComp),
  'generate-scene-video': withNodeChrome(GenerateSceneVideoNodeComp),
  'character-card': withNodeChrome(CharacterCardNodeComp),
};

const QUICK_ADD: Array<{ kind: NodeKind; label: string; hint: string }> = [
  { kind: 'audio-input', label: '音频输入', hint: '上传或预览音频素材' },
  { kind: 'text-node', label: '文本', hint: '提示词 / 小说片段' },
  { kind: 'chat', label: '对话', hint: '简单的 LLM 对话测试' },
  { kind: 'input-image', label: '图片输入', hint: '粘贴或导入参考图' },
  { kind: 'gen-image', label: '图片生成', hint: '文生图 / 图生图' },
  { kind: 'character-card', label: '角色卡', hint: '生成角色三视图+表情包' },
  { kind: 'script-to-storyboard', label: '剧本转分镜', hint: 'AI 生成分镜脚本+首尾帧' },
  { kind: 'storyboard-viewer', label: '分镜展示', hint: '查看分镜首尾帧' },
  { kind: 'gen-video', label: '视频生成', hint: '根据提示生成视频' },
  { kind: 'video-analyze', label: '视频分析', hint: '提取关键帧描述' },
  { kind: 'extract-characters-scenes', label: '抽取角色 / 场景', hint: '从文本生成资产' },
  { kind: 'preview', label: '预览', hint: '查看图像或视频' },
  { kind: 'image-compare', label: '图片对比', hint: '并排查看多张生成结果' },
];

const REFERENCE_DROP_TARGETS: ReadonlySet<NodeKind> = new Set(['gen-image']);
const PENDING_NODE_PICKER_HEIGHT = 180;
const REFERENCE_PICKER_HEIGHT = 300;

type ContextMenuState =
  | { type: 'pane'; x: number; y: number; flowX: number; flowY: number }
  | { type: 'node'; x: number; y: number; nodeId: NodeId }
  | { type: 'edge'; x: number; y: number; edgeId: string }
  | null;

function toFlowNode(n: AppNode): RFNode {
  const selected = useCanvas.getState().selectedIds.includes(n.id);
  return {
    id: n.id,
    type: n.kind,
    position: { x: n.x, y: n.y },
    data: {},
    width: n.width,
    height: n.height,
    selected,
  };
}

function toFlowEdge(e: AppEdge, selectedEdgeId: string | null): RFEdge {
  const selected = e.id === selectedEdgeId;
  return {
    id: e.id,
    source: e.from,
    target: e.to,
    selected,
    className: selected ? 'canvas-edge canvas-edge-selected' : 'canvas-edge',
  };
}

function firstImageFile(dataTransfer: DataTransfer): File | null {
  for (const file of Array.from(dataTransfer.files)) {
    if (file.type.startsWith('image/')) return file;
  }
  return null;
}

function hasImageItem(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.items).some((item) => item.type.startsWith('image/'));
}

function findDropTarget(nodes: AppNode[], x: number, y: number): AppNode | null {
  for (const node of [...nodes].reverse()) {
    if (!REFERENCE_DROP_TARGETS.has(node.kind)) continue;
    if (x < node.x || y < node.y) continue;
    if (x > node.x + node.width || y > node.y + node.height) continue;
    return node;
  }
  return null;
}

export function Canvas() {
  const nodes = useCanvas((s) => s.nodes);
  const edges = useCanvas((s) => s.edges);
  const addNode = useCanvas((s) => s.addNode);
  const moveNode = useCanvas((s) => s.moveNode);
  const removeNode = useCanvas((s) => s.removeNode);
  const removeEdge = useCanvas((s) => s.removeEdge);
  const addEdge = useCanvas((s) => s.addEdge);
  const setSelection = useCanvas((s) => s.setSelection);
  const selectedIds = useCanvas((s) => s.selectedIds);
  const [flow, setFlow] = useState<ReactFlowInstance | null>(null);
  const [menu, setMenu] = useState<ContextMenuState>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const connectionSourceIdRef = useRef<NodeId | null>(null);
  const suppressNextCanvasClickRef = useRef(false);

  const flowNodes = useMemo(() => nodes.map(toFlowNode), [nodes, selectedIds]);
  const flowEdges = useMemo(
    () => edges.map((edge) => toFlowEdge(edge, selectedEdgeId)),
    [edges, selectedEdgeId],
  );

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      for (const ch of changes) {
        if (ch.type === 'position' && ch.position) {
          moveNode(ch.id as NodeId, ch.position.x, ch.position.y);
        } else if (ch.type === 'dimensions' && ch.dimensions) {
          useCanvas
            .getState()
            .resizeNode(ch.id as NodeId, ch.dimensions.width, ch.dimensions.height);
        } else if (ch.type === 'remove') {
          removeNode(ch.id as NodeId);
        } else if (ch.type === 'select') {
          const cur = useCanvas.getState().selectedIds;
          const next = ch.selected
            ? cur.includes(ch.id as NodeId)
              ? cur
              : [...cur, ch.id as NodeId]
            : cur.filter((sid) => sid !== ch.id);
          setSelection(next);
        }
      }
    },
    [moveNode, removeNode, setSelection],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const ch of changes) {
        if (ch.type === 'remove') {
          removeEdge(ch.id);
          if (selectedEdgeId === ch.id) setSelectedEdgeId(null);
        } else if (ch.type === 'select') {
          setSelectedEdgeId(ch.selected ? ch.id : null);
          if (ch.selected) setSelection([]);
        }
      }
    },
    [removeEdge, selectedEdgeId, setSelection],
  );

  const onConnect: OnConnect = useCallback(
    (c) => {
      if (!c.source || !c.target || c.source === c.target) return;
      addEdge({ id: edgeId(), from: c.source as NodeId, to: c.target as NodeId });
      setSelectedEdgeId(null);
    },
    [addEdge],
  );

  const onConnectStart: OnConnectStart = useCallback((_event, params) => {
    connectionSourceIdRef.current = params.nodeId ? (params.nodeId as NodeId) : null;
  }, []);

  const onConnectEnd: OnConnectEnd = useCallback(
    (event, connectionState) => {
      if (!flow) return;
      const sourceId =
        (connectionState.fromNode?.id as NodeId | undefined) ?? connectionSourceIdRef.current;
      connectionSourceIdRef.current = null;
      if (!sourceId || connectionState.toNode) return;
      const point = getClientPoint(event);
      if (!point) return;
      const pos = flow.screenToFlowPosition(point);
      suppressNextCanvasClickRef.current = true;
      const sourceNode = useCanvas.getState().nodes.find((n) => n.id === sourceId);
      const height =
        sourceNode?.kind === 'image-compare' ? REFERENCE_PICKER_HEIGHT : PENDING_NODE_PICKER_HEIGHT;
      const node = createNode('pending-node-picker', {
        x: pos.x,
        y: pos.y - height / 2,
      });
      node.height = height;
      addNode(node);
      addEdge({ id: edgeId(), from: sourceId, to: node.id });
      setSelection([sourceId, node.id]);
    },
    [addEdge, addNode, flow, setSelection],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    if (!hasImageItem(e.dataTransfer) && !hasHistoryImageDragData(e.dataTransfer)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      const file = firstImageFile(e.dataTransfer);
      const historyImage = getHistoryImageDragData(e.dataTransfer);
      if ((!file && !historyImage) || !flow) return;

      e.preventDefault();
      e.stopPropagation();

      const dropPos = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const target = findDropTarget(useCanvas.getState().nodes, dropPos.x, dropPos.y);

      const readImage = file
        ? fileToDataURL(file).then((url) => ({
            url,
            filename: file.name,
          }))
        : Promise.resolve({
            url: historyImage?.url ?? '',
            filename: historyImage?.filename ?? 'history-image.png',
          });

      void readImage.then(({ url, filename }) => {
        const state = useCanvas.getState();
        const currentTarget = target
          ? state.nodes.find((node) => node.id === target.id)
          : undefined;
        const targetNode =
          currentTarget && REFERENCE_DROP_TARGETS.has(currentTarget.kind) ? currentTarget : null;
        const inputPos = targetNode
          ? {
              x: targetNode.x - 340,
              y: targetNode.y,
            }
          : dropPos;
        const inputNode = createInputImageFromDataURL(url, filename, inputPos);

        state.addNode(inputNode);
        if (targetNode) {
          state.addEdge({ id: edgeId(), from: inputNode.id, to: targetNode.id });
          state.setSelection([inputNode.id, targetNode.id]);
        } else {
          state.setSelection([inputNode.id]);
        }
      });
    },
    [flow],
  );

  const onNodeDragStart: OnNodeDrag = useCallback(() => {
    useTemporal.getState().pause();
  }, []);

  const onNodeDragStop: OnNodeDrag = useCallback(
    (_e, node) => {
      const t = useTemporal.getState();
      t.resume();
      moveNode(node.id as NodeId, node.position.x, node.position.y);
    },
    [moveNode],
  );

  const closeMenu = useCallback(() => setMenu(null), []);

  const onPaneContextMenu = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      e.preventDefault();
      if (!flow) return;
      const pos = flow.screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setMenu({
        type: 'pane',
        x: e.clientX,
        y: e.clientY,
        flowX: pos.x,
        flowY: pos.y,
      });
    },
    [flow],
  );

  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: RFNode) => {
      e.preventDefault();
      setSelectedEdgeId(null);
      setSelection([node.id as NodeId]);
      setMenu({
        type: 'node',
        x: e.clientX,
        y: e.clientY,
        nodeId: node.id as NodeId,
      });
    },
    [setSelection],
  );

  const onEdgeClick = useCallback(
    (e: React.MouseEvent, edge: RFEdge) => {
      e.stopPropagation();
      setSelectedEdgeId(edge.id);
      setSelection([]);
      closeMenu();
    },
    [closeMenu, setSelection],
  );

  const onEdgeContextMenu = useCallback(
    (e: React.MouseEvent, edge: RFEdge) => {
      e.preventDefault();
      e.stopPropagation();
      setSelectedEdgeId(edge.id);
      setSelection([]);
      setMenu({
        type: 'edge',
        x: e.clientX,
        y: e.clientY,
        edgeId: edge.id,
      });
    },
    [setSelection],
  );

  const clearSelection = useCallback(() => {
    setSelectedEdgeId(null);
    setSelection([]);
    closeMenu();
  }, [closeMenu, setSelection]);

  const onCanvasClick = useCallback(() => {
    if (suppressNextCanvasClickRef.current) {
      suppressNextCanvasClickRef.current = false;
      return;
    }
    closeMenu();
  }, [closeMenu]);

  const onPaneClick = useCallback(() => {
    if (suppressNextCanvasClickRef.current) {
      suppressNextCanvasClickRef.current = false;
      return;
    }
    clearSelection();
  }, [clearSelection]);

  const addQuickNode = useCallback(
    (kind: NodeKind) => {
      if (!menu || menu.type !== 'pane') return;
      if (!isNodeFeatureEnabled(kind)) {
        window.alert(FEATURE_DISABLED_MESSAGE);
        return;
      }
      addNode(createNode(kind, { x: menu.flowX, y: menu.flowY }));
      closeMenu();
    },
    [addNode, closeMenu, menu],
  );

  const deleteNode = useCallback(
    (id: NodeId) => {
      removeNode(id);
      setSelectedEdgeId(null);
      closeMenu();
    },
    [closeMenu, removeNode],
  );

  const deleteEdge = useCallback(
    (id: string) => {
      removeEdge(id);
      setSelectedEdgeId(null);
      closeMenu();
    },
    [closeMenu, removeEdge],
  );

  useEffect(() => {
    if (selectedEdgeId && !edges.some((edge) => edge.id === selectedEdgeId)) {
      setSelectedEdgeId(null);
    }
  }, [edges, selectedEdgeId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
        return;
      }
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }
      const state = useCanvas.getState();
      if (!selectedEdgeId && state.selectedIds.length === 0) return;
      e.preventDefault();
      if (selectedEdgeId) {
        state.removeEdge(selectedEdgeId);
        setSelectedEdgeId(null);
        return;
      }
      for (const id of state.selectedIds) {
        state.removeNode(id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeMenu, selectedEdgeId]);

  return (
    <div className="h-full w-full" onClick={onCanvasClick}>
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onInit={setFlow}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onConnectStart={onConnectStart}
        onConnectEnd={onConnectEnd}
        onDragOverCapture={onDragOver}
        onDropCapture={onDrop}
        onNodeDragStart={onNodeDragStart}
        onNodeDragStop={onNodeDragStop}
        onPaneContextMenu={onPaneContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        onEdgeClick={onEdgeClick}
        onEdgeContextMenu={onEdgeContextMenu}
        onPaneClick={onPaneClick}
        onMoveStart={closeMenu}
        fitView
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} color="#e5e5e5" />
        <Controls position="bottom-right" />
        <MiniMap pannable zoomable position="top-right" />
      </ReactFlow>
      {menu?.type === 'pane' && (
        <ContextMenu x={menu.x} y={menu.y}>
          <div className="px-2 pb-1 pt-2 text-[11px] font-semibold text-zinc-400">快速添加</div>
          {QUICK_ADD.map((item) => {
            const disabled = !isNodeFeatureEnabled(item.kind);
            return (
            <button
              key={item.kind}
              type="button"
              className="flex w-full flex-col rounded-md px-3 py-2 text-left hover:bg-zinc-100 disabled:cursor-not-allowed disabled:bg-zinc-50"
              disabled={disabled}
              title={disabled ? FEATURE_DISABLED_MESSAGE : item.label}
              onClick={(e) => {
                e.stopPropagation();
                addQuickNode(item.kind);
              }}
            >
              <span className="text-[13px] font-medium leading-5 text-zinc-800">
                {item.label}
                {disabled ? '（即将上线）' : ''}
              </span>
              <span className="text-[11px] leading-4 text-zinc-400">
                {disabled ? FEATURE_DISABLED_MESSAGE : item.hint}
              </span>
            </button>
            );
          })}
        </ContextMenu>
      )}
      {menu?.type === 'node' && (
        <ContextMenu x={menu.x} y={menu.y}>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-8 rounded-md px-3 py-2 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              deleteNode(menu.nodeId);
            }}
          >
            删除节点
            <span className="text-[11px] font-normal text-red-300">Delete</span>
          </button>
        </ContextMenu>
      )}
      {menu?.type === 'edge' && (
        <ContextMenu x={menu.x} y={menu.y}>
          <button
            type="button"
            className="flex w-full items-center justify-between gap-8 rounded-md px-3 py-2 text-left text-[13px] font-medium text-red-600 hover:bg-red-50"
            onClick={(e) => {
              e.stopPropagation();
              deleteEdge(menu.edgeId);
            }}
          >
            删除连线
            <span className="text-[11px] font-normal text-red-300">Delete</span>
          </button>
        </ContextMenu>
      )}
    </div>
  );
}

function getClientPoint(event: MouseEvent | TouchEvent): { x: number; y: number } | null {
  if ('changedTouches' in event) {
    const touch = event.changedTouches[0];
    return touch ? { x: touch.clientX, y: touch.clientY } : null;
  }
  return { x: event.clientX, y: event.clientY };
}

function ContextMenu({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  return (
    <div
      className="fixed z-50 min-w-[190px] rounded-lg border border-zinc-200 bg-white p-1 shadow-xl shadow-zinc-300/40"
      style={{ left: x, top: y }}
      onContextMenu={(e) => e.preventDefault()}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}
