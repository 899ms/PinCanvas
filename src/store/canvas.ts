import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { temporal } from 'zundo';
import type { AppEdge } from '@/types/edge';
import type { AppNode, NodeBase, NodeId, NodeKind } from '@/types/node';

type NodeBasePatch = Partial<Omit<NodeBase, 'id' | 'kind'>>;

export interface CanvasState {
  nodes: AppNode[];
  edges: AppEdge[];
  // 运行态，不进撤销栈
  selectedIds: NodeId[];

  addNode: (n: AppNode) => void;
  replaceNode: (id: NodeId, node: AppNode) => void;
  moveNode: (id: NodeId, x: number, y: number) => void;
  resizeNode: (id: NodeId, width: number, height: number) => void;
  patchNode: (id: NodeId, patch: NodeBasePatch) => void;
  patchSettings: <K extends NodeKind>(
    id: NodeId,
    patch: Partial<Extract<AppNode, { kind: K }>['settings']>,
  ) => void;
  removeNode: (id: NodeId) => void;

  addEdge: (e: AppEdge) => void;
  patchEdge: (id: string, patch: Partial<Omit<AppEdge, 'id' | 'from' | 'to'>>) => void;
  removeEdge: (id: string) => void;

  setSelection: (ids: NodeId[]) => void;
  clear: () => void;
  hydrate: (snapshot: { nodes: AppNode[]; edges: AppEdge[] }) => void;
}

export const useCanvas = create<CanvasState>()(
  temporal(
    immer((set) => ({
      nodes: [],
      edges: [],
      selectedIds: [],

      addNode: (n) =>
        set((s) => {
          s.nodes.push(n);
        }),

      replaceNode: (id, node) =>
        set((s) => {
          const i = s.nodes.findIndex((n) => n.id === id);
          if (i >= 0) s.nodes[i] = node;
        }),

      moveNode: (id, x, y) =>
        set((s) => {
          const n = s.nodes.find((node) => node.id === id);
          if (n) {
            n.x = x;
            n.y = y;
          }
        }),

      resizeNode: (id, width, height) =>
        set((s) => {
          const n = s.nodes.find((node) => node.id === id);
          if (n) {
            n.width = width;
            n.height = height;
          }
        }),

      patchNode: (id, patch) =>
        set((s) => {
          const n = s.nodes.find((node) => node.id === id);
          if (n) Object.assign(n, patch);
        }),

      patchSettings: (id, patch) =>
        set((s) => {
          const n = s.nodes.find((node) => node.id === id);
          if (n) Object.assign(n.settings as Record<string, unknown>, patch);
        }),

      removeNode: (id) =>
        set((s) => {
          s.nodes = s.nodes.filter((n) => n.id !== id);
          s.edges = s.edges.filter((e) => e.from !== id && e.to !== id);
          s.selectedIds = s.selectedIds.filter((sid) => sid !== id);
        }),

      addEdge: (e) =>
        set((s) => {
          if (s.edges.some((edge) => edge.from === e.from && edge.to === e.to)) return;
          s.edges.push(e);
        }),

      patchEdge: (id, patch) =>
        set((s) => {
          const edge = s.edges.find((e) => e.id === id);
          if (edge) Object.assign(edge, patch);
        }),

      removeEdge: (id) =>
        set((s) => {
          s.edges = s.edges.filter((e) => e.id !== id);
        }),

      setSelection: (ids) =>
        set((s) => {
          s.selectedIds = ids;
        }),

      clear: () =>
        set((s) => {
          s.nodes = [];
          s.edges = [];
          s.selectedIds = [];
        }),

      hydrate: (snap) =>
        set((s) => {
          s.nodes = snap.nodes;
          s.edges = snap.edges;
          s.selectedIds = [];
        }),
    })),
    {
      limit: 256,
      partialize: (state) => ({ nodes: state.nodes, edges: state.edges }),
      equality: (a, b) => a.nodes === b.nodes && a.edges === b.edges,
    },
  ),
);

export const useTemporal = useCanvas.temporal;

/** 用 IDB 快照填充画布，且不污染撤销栈。 */
export function hydrateCanvas(snap: { nodes: AppNode[]; edges: AppEdge[] }): void {
  const t = useCanvas.temporal.getState();
  t.pause();
  useCanvas.getState().hydrate(snap);
  t.resume();
  t.clear();
}
