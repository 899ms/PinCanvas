import { beforeAll, describe, expect, it } from 'vitest';
import type { AppNode, NodeId } from '@/types/node';
import type { ProjectSnapshot } from '@/types/project';
import { getAsset, loadSnapshot, putAsset, saveSnapshot } from '../persistence';

const nid = (s: string) => s as NodeId;
const png = (body: string) => `data:image/png;base64,${body}`;

beforeAll(() => {
  if (typeof globalThis.localStorage === 'undefined') {
    const store = new Map<string, string>();
    globalThis.localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, v);
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => {
        store.clear();
      },
      key: (i: number) => Array.from(store.keys())[i] ?? null,
      get length() {
        return store.size;
      },
    } as Storage;
  }
});

function inputImage(content: string, maskContent?: string): AppNode {
  return {
    id: nid('node_input'),
    kind: 'input-image',
    x: 0,
    y: 0,
    width: 220,
    height: 200,
    settings: { content, maskContent },
  };
}

describe('persistence assets', () => {
  it('putAsset 用内容生成稳定 id，重复写不会改变 id', async () => {
    const dataUrl = png('abc');
    const a = await putAsset(dataUrl);
    const b = await putAsset(dataUrl);

    expect(a).toBe(b);
    expect(await getAsset(a)).toBe(dataUrl);
  });

  it('saveSnapshot 抽离 dataURL，loadSnapshot 还原完整节点', async () => {
    const image = png('image-data');
    const mask = png('mask-data');
    const snapshot: ProjectSnapshot = {
      version: 1,
      savedAt: 123,
      projectName: 'asset-test',
      nodes: [inputImage(image, mask)],
      edges: [],
    };

    await saveSnapshot(snapshot);
    const loaded = await loadSnapshot();

    expect(loaded?.nodes[0]).toMatchObject({
      kind: 'input-image',
      settings: {
        content: image,
        maskContent: mask,
      },
    });
    expect(loaded?.assetIdsByNode?.node_input).toHaveLength(2);
  });

  it('远端 URL 不会被抽离成 asset', async () => {
    const url = 'https://example.com/image.png';
    await saveSnapshot({
      version: 1,
      savedAt: 456,
      projectName: 'remote-url-test',
      nodes: [inputImage(url)],
      edges: [],
    });

    const loaded = await loadSnapshot();
    expect(loaded?.nodes[0]).toMatchObject({
      settings: { content: url },
    });
    expect(loaded?.assetIdsByNode?.node_input).toBeUndefined();
  });
});
