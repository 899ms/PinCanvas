import { create } from 'zustand';
import type { NodeId } from '@/types/node';
import { getPref } from './prefs';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Task {
  id: string;
  nodeId: NodeId;
  status: TaskStatus;
  error?: string;
  startedAt?: number;
  finishedAt?: number;
}

interface QueueItem {
  task: Task;
  fn: () => Promise<void>;
}

interface TaskState {
  tasks: Record<string, Task>;
  byNode: Record<string, string>;
  _queue: QueueItem[];
  enqueue: (nodeId: NodeId, fn: () => Promise<void>) => string;
  clearAll: () => void;
}

let counter = 0;
function newTaskId(): string {
  counter += 1;
  return `task_${Date.now()}_${counter}`;
}

export const useTasks = create<TaskState>((set, get) => {
  function setStatus(id: string, patch: Partial<Task>): void {
    set((s) => {
      const cur = s.tasks[id];
      if (!cur) return s;
      return { tasks: { ...s.tasks, [id]: { ...cur, ...patch } } };
    });
  }

  function dispatch(): void {
    const mode = getPref<'parallel' | 'serial'>('batch_queue_mode', 'parallel');
    const concurrencyPref = Number(getPref('batch_concurrency', 1));
    const concurrency = mode === 'serial' ? 1 : Math.max(1, concurrencyPref);
    while (true) {
      const state = get();
      const running = Object.values(state.tasks).filter((t) => t.status === 'running').length;
      if (running >= concurrency) break;
      if (state._queue.length === 0) break;
      const next = state._queue[0];
      set((s) => ({ _queue: s._queue.slice(1) }));
      setStatus(next.task.id, { status: 'running', startedAt: Date.now() });
      void next.fn().then(
        () => {
          setStatus(next.task.id, { status: 'completed', finishedAt: Date.now() });
          dispatch();
        },
        (err: unknown) => {
          setStatus(next.task.id, {
            status: 'failed',
            finishedAt: Date.now(),
            error: err instanceof Error ? err.message : String(err),
          });
          dispatch();
        },
      );
    }
  }

  return {
    tasks: {},
    byNode: {},
    _queue: [],
    enqueue: (nodeId, fn) => {
      const id = newTaskId();
      const task: Task = { id, nodeId, status: 'pending' };
      set((s) => ({
        tasks: { ...s.tasks, [id]: task },
        byNode: { ...s.byNode, [nodeId]: id },
        _queue: [...s._queue, { task, fn }],
      }));
      dispatch();
      return id;
    },
    clearAll: () => {
      set({ tasks: {}, byNode: {}, _queue: [] });
    },
  };
});

export function useNodeTask(nodeId: NodeId): Task | undefined {
  return useTasks((s) => {
    const tid = s.byNode[nodeId];
    return tid ? s.tasks[tid] : undefined;
  });
}
