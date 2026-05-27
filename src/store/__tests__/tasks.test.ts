import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { NodeId } from '@/types/node';
import { setPref } from '@/store/prefs';
import { useTasks } from '../tasks';

const nid = (s: string) => s as NodeId;

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

beforeEach(() => {
  useTasks.getState().clearAll();
  setPref('batch_queue_mode', 'parallel');
  setPref('batch_concurrency', 1);
});

afterEach(() => {
  useTasks.getState().clearAll();
});

function delayedTask(ms: number, opts: { fail?: string; trace?: () => void } = {}) {
  return () =>
    new Promise<void>((resolve, reject) => {
      opts.trace?.();
      setTimeout(() => {
        if (opts.fail) reject(new Error(opts.fail));
        else resolve();
      }, ms);
    });
}

async function flush(ms = 50) {
  await new Promise((r) => setTimeout(r, ms));
}

describe('tasks store', () => {
  it('单任务完成 → status=completed', async () => {
    const id = useTasks.getState().enqueue(nid('n1'), delayedTask(10));
    await flush(40);
    expect(useTasks.getState().tasks[id]).toMatchObject({ status: 'completed' });
  });

  it('任务抛错 → status=failed + error 字段', async () => {
    const id = useTasks.getState().enqueue(nid('n1'), delayedTask(10, { fail: 'boom' }));
    await flush(40);
    expect(useTasks.getState().tasks[id]).toMatchObject({ status: 'failed', error: 'boom' });
  });

  it('concurrency=1（默认）→ 两个任务串行（峰值 running=1）', async () => {
    let currentlyRunning = 0;
    let peak = 0;
    const probe = () =>
      delayedTask(30, {
        trace: () => {
          currentlyRunning += 1;
          peak = Math.max(peak, currentlyRunning);
          setTimeout(() => {
            currentlyRunning -= 1;
          }, 30);
        },
      });
    useTasks.getState().enqueue(nid('a'), probe());
    useTasks.getState().enqueue(nid('b'), probe());
    await flush(100);
    expect(peak).toBe(1);
  });

  it('concurrency=2 → 两个任务并行（峰值 running=2）', async () => {
    setPref('batch_concurrency', 2);
    let currentlyRunning = 0;
    let peak = 0;
    const probe = () =>
      delayedTask(40, {
        trace: () => {
          currentlyRunning += 1;
          peak = Math.max(peak, currentlyRunning);
          setTimeout(() => {
            currentlyRunning -= 1;
          }, 40);
        },
      });
    useTasks.getState().enqueue(nid('a'), probe());
    useTasks.getState().enqueue(nid('b'), probe());
    await flush(120);
    expect(peak).toBe(2);
  });

  it('serial 模式强制 concurrency=1（即使 batch_concurrency=4）', async () => {
    setPref('batch_queue_mode', 'serial');
    setPref('batch_concurrency', 4);
    let currentlyRunning = 0;
    let peak = 0;
    const probe = () =>
      delayedTask(20, {
        trace: () => {
          currentlyRunning += 1;
          peak = Math.max(peak, currentlyRunning);
          setTimeout(() => {
            currentlyRunning -= 1;
          }, 20);
        },
      });
    useTasks.getState().enqueue(nid('a'), probe());
    useTasks.getState().enqueue(nid('b'), probe());
    useTasks.getState().enqueue(nid('c'), probe());
    await flush(100);
    expect(peak).toBe(1);
  });

  it('byNode 跟踪节点最近一次任务', () => {
    const tid = useTasks.getState().enqueue(nid('n1'), () => new Promise(() => {}));
    expect(useTasks.getState().byNode['n1']).toBe(tid);
  });
});
