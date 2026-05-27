import { ApiError, PollTimeoutError } from './errors';
import { request } from './client';

export type PollStatus = 'pending' | 'completed' | 'failed';

export interface PollOptions<T> {
  interval?: number;
  backoff?: number;
  maxInterval?: number;
  maxDuration?: number;
  apiKey?: string;
  signal?: AbortSignal;
  isDone: (resp: T) => PollStatus;
}

export async function pollTask<T>(url: string, opts: PollOptions<T>): Promise<T> {
  const start = Date.now();
  const interval0 = opts.interval ?? 2_000;
  const backoff = opts.backoff ?? 1.4;
  const maxInterval = opts.maxInterval ?? 10_000;
  const maxDuration = opts.maxDuration ?? 300_000;

  let delay = interval0;
  while (true) {
    const elapsed = Date.now() - start;
    if (elapsed > maxDuration) throw new PollTimeoutError(maxDuration);

    const resp = await request<T>({
      url,
      method: 'GET',
      apiKey: opts.apiKey,
      signal: opts.signal,
    });
    const status = opts.isDone(resp);
    if (status === 'completed') return resp;
    if (status === 'failed') throw new ApiError('Task failed', 0, 'task_failed', 'task_failed');

    const remaining = maxDuration - (Date.now() - start);
    if (remaining <= 0) throw new PollTimeoutError(maxDuration);
    await sleep(Math.min(delay, remaining));
    delay = Math.min(delay * backoff, maxInterval);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
