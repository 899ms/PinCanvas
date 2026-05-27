import { request } from './client';
import { pollTask } from './poll';

export interface MJSubmitResult {
  code: number;
  description?: string;
  /** 主流代理返回 result = messageId */
  result?: string;
  /** 部分代理用 taskId */
  taskId?: string;
}

export interface MJTask {
  id?: string;
  status?: 'NOT_START' | 'SUBMITTED' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILURE' | string;
  progress?: string;
  imageUrl?: string;
  description?: string;
  failReason?: string;
}

export interface MJImagineOpts {
  baseUrl: string;
  apiKey?: string;
  prompt: string;
  signal?: AbortSignal;
}

/**
 * Midjourney 提交 imagine + 轮询直到 SUCCESS / FAILURE。
 * 走的是 MJ 代理网关协议（`/mj/submit/imagine` + `/mj/task/{id}/fetch`），不是 OpenAI 兼容。
 */
export async function mjImagine(opts: MJImagineOpts): Promise<MJTask> {
  const baseUrl = opts.baseUrl.replace(/\/+$/, '');
  const submit = await request<MJSubmitResult>({
    url: `${baseUrl}/mj/submit/imagine`,
    method: 'POST',
    apiKey: opts.apiKey,
    body: JSON.stringify({ prompt: opts.prompt }),
    bodyKind: 'json',
    signal: opts.signal,
  });
  const taskId = submit.result ?? submit.taskId;
  if (!taskId) {
    throw new Error(`MJ 提交失败: ${submit.description ?? 'no taskId'}`);
  }
  return pollTask<MJTask>(`${baseUrl}/mj/task/${taskId}/fetch`, {
    interval: 3_000,
    backoff: 1.2,
    maxInterval: 10_000,
    maxDuration: 6 * 60_000,
    apiKey: opts.apiKey,
    signal: opts.signal,
    isDone: (r) => {
      if (r.status === 'SUCCESS') return 'completed';
      if (r.status === 'FAILURE') return 'failed';
      return 'pending';
    },
  });
}

/**
 * 把 MJ 4 张拼图切成 4 张独立图（左上、右上、左下、右下）。
 * 依赖浏览器 Image + canvas（仅在 dev 运行时可用）。
 */
export async function splitMjGrid(url: string): Promise<string[]> {
  const img = await loadImage(url);
  const w = img.naturalWidth / 2;
  const h = img.naturalHeight / 2;
  const out: string[] = [];
  const offsets: Array<[number, number]> = [
    [0, 0],
    [w, 0],
    [0, h],
    [w, h],
  ];
  for (const [sx, sy] of offsets) {
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas 2d ctx unavailable');
    ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h);
    out.push(canvas.toDataURL('image/png'));
  }
  return out;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`load image failed: ${url}`));
    img.src = url;
  });
}
