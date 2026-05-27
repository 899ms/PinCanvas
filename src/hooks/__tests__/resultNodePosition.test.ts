import { describe, expect, it } from 'vitest';
import type { AppEdge } from '@/types/edge';
import type { AppNode, NodeId } from '@/types/node';
import { getResultNodePosition } from '@/canvas/resultLayout';

const id = (value: string) => value as NodeId;

function baseNode(value: string, x: number, y: number, width = 100, height = 100): AppNode {
  return {
    id: id(value),
    kind: 'gen-image',
    x,
    y,
    width,
    height,
    settings: { prompt: '', model: 'wan2.7-image', ratio: '1:1', resolution: '1024x1024' },
  };
}

function imageCompare(value: string, x: number, y: number): AppNode {
  return {
    id: id(value),
    kind: 'image-compare',
    x,
    y,
    width: 320,
    height: 220,
    settings: { images: ['data:image/png;base64,a'] },
  };
}

function edge(from: string, to: string): AppEdge {
  return { id: `${from}->${to}`, from: id(from), to: id(to) };
}

describe('getResultNodePosition', () => {
  it('places the first result to the right of the source', () => {
    const source = baseNode('source', 10, 20, 200, 120);

    expect(getResultNodePosition(source, [source], [], 'image-compare', 320, 220)).toEqual({
      x: 290,
      y: 20,
    });
  });

  it('offsets later results from the same source', () => {
    const source = baseNode('source', 10, 20, 200, 120);
    const firstResult = imageCompare('result-1', 290, 20);
    const nodes = [source, firstResult];
    const edges = [edge('source', 'result-1')];

    expect(getResultNodePosition(source, nodes, edges, 'image-compare', 320, 220)).toEqual({
      x: 290,
      y: 260,
    });
  });

  it('keeps moving down until it avoids occupied space', () => {
    const source = baseNode('source', 10, 20, 200, 120);
    const blocker = imageCompare('blocker', 290, 20);
    const nodes = [source, blocker];

    expect(getResultNodePosition(source, nodes, [], 'image-compare', 320, 220)).toEqual({
      x: 290,
      y: 260,
    });
  });
});
