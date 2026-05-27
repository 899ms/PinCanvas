import type { AppEdge } from './edge';
import type { AppNode } from './node';

export interface ProjectSnapshot {
  version: 1;
  savedAt: number;
  projectName: string;
  nodes: AppNode[];
  edges: AppEdge[];
  assetIdsByNode?: Record<string, string[]>;
}
