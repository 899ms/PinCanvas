import type { AppEdge } from '@/types/edge';
import type { AppNode } from '@/types/node';

const RESULT_NODE_GAP_X = 80;
const RESULT_NODE_STEP_Y = 48;
const RESULT_NODE_COLLISION_PADDING = 16;

type ResultNodeKind = 'image-compare' | 'preview';

export function getResultNodePosition(
  source: AppNode,
  nodes: AppNode[],
  edges: AppEdge[],
  resultKind: ResultNodeKind,
  width: number,
  height: number,
): { x: number; y: number } {
  const siblingCount = edges.filter((edge) => {
    if (edge.from !== source.id) return false;
    return nodes.find((node) => node.id === edge.to)?.kind === resultKind;
  }).length;
  const x = source.x + source.width + RESULT_NODE_GAP_X;
  let y = source.y + siblingCount * RESULT_NODE_STEP_Y;

  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (!nodes.some((node) => node.id !== source.id && overlapsNode(x, y, width, height, node))) {
      return { x, y };
    }
    y += RESULT_NODE_STEP_Y;
  }
  return { x, y };
}

function overlapsNode(x: number, y: number, width: number, height: number, node: AppNode): boolean {
  return (
    x < node.x + node.width + RESULT_NODE_COLLISION_PADDING &&
    x + width + RESULT_NODE_COLLISION_PADDING > node.x &&
    y < node.y + node.height + RESULT_NODE_COLLISION_PADDING &&
    y + height + RESULT_NODE_COLLISION_PADDING > node.y
  );
}
