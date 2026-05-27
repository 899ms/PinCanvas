import type { NodeId } from '@/types/node';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function nodeId(): NodeId {
  let s = 'node_';
  for (let i = 0; i < 10; i++) {
    s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return s as NodeId;
}

export function edgeId(): string {
  return 'edge_' + Math.random().toString(36).slice(2, 12);
}
