import type { BuiltVideoRequest } from './videos';

export type BackgroundVideoTaskStatus =
  | 'queued'
  | 'submitting'
  | 'polling'
  | 'completed'
  | 'failed'
  | 'awaiting_auth';

export interface BackgroundVideoTask {
  id: string;
  clientId: string;
  nodeId: string;
  historyEntryId?: string;
  model: string;
  baseUrl: string;
  endpoint: string;
  body: Record<string, unknown>;
  async: boolean;
  status: BackgroundVideoTaskStatus;
  tokenHash: string;
  upstreamTaskId?: string;
  pollUrl?: string;
  resultUrl?: string;
  error?: string;
  createdAt: number;
  updatedAt: number;
  completedAt?: number;
}

interface SubmitBackgroundVideoTaskInput {
  clientId: string;
  nodeId: string;
  historyEntryId?: string;
  model: string;
  baseUrl: string;
  apiKey: string;
  request: BuiltVideoRequest;
}

const CLIENT_ID_KEY = 'tapnow_video_task_client_id';

export function getVideoTaskClientId(): string {
  const existing = localStorage.getItem(CLIENT_ID_KEY);
  if (existing) return existing;
  const id =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `client_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  localStorage.setItem(CLIENT_ID_KEY, id);
  return id;
}

export async function submitBackgroundVideoTask(
  input: SubmitBackgroundVideoTaskInput,
): Promise<BackgroundVideoTask> {
  const res = await fetch('/api/video/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      clientId: input.clientId,
      nodeId: input.nodeId,
      historyEntryId: input.historyEntryId,
      model: input.model,
      baseUrl: input.baseUrl,
      apiKey: input.apiKey,
      endpoint: input.request.endpoint,
      body: input.request.body,
      async: input.request.async,
    }),
  });
  return readTaskResponse(res);
}

export async function getBackgroundVideoTask(id: string): Promise<BackgroundVideoTask> {
  const res = await fetch(`/api/video/tasks/${encodeURIComponent(id)}`);
  return readTaskResponse(res);
}

export async function listBackgroundVideoTasks(
  clientId: string,
): Promise<BackgroundVideoTask[]> {
  const res = await fetch(`/api/video/tasks?clientId=${encodeURIComponent(clientId)}`);
  const body = (await res.json()) as { tasks?: BackgroundVideoTask[]; error?: string };
  if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
  return Array.isArray(body.tasks) ? body.tasks : [];
}

export async function resumeBackgroundVideoTask(
  id: string,
  apiKey: string,
): Promise<BackgroundVideoTask> {
  const res = await fetch(`/api/video/tasks/${encodeURIComponent(id)}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ apiKey }),
  });
  return readTaskResponse(res);
}

export async function waitForBackgroundVideoTask(
  id: string,
  intervalMs = 2_000,
): Promise<BackgroundVideoTask> {
  while (true) {
    const task = await getBackgroundVideoTask(id);
    if (task.status === 'completed') return task;
    if (task.status === 'failed') throw new Error(task.error || 'Video task failed');
    if (task.status === 'awaiting_auth') {
      throw new Error('后台视频任务等待重新提供 API Key');
    }
    await sleep(intervalMs);
  }
}

function readTaskResponse(res: Response): Promise<BackgroundVideoTask> {
  return res.json().then((body: { task?: BackgroundVideoTask; error?: string }) => {
    if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
    if (!body.task) throw new Error('Video task response missing task');
    return body.task;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
