import { ApiError, TimeoutError } from './errors';

export interface RequestOptions {
  url: string;
  method: 'POST' | 'GET';
  apiKey?: string;
  headers?: Record<string, string>;
  body?: BodyInit;
  bodyKind?: 'json' | 'form';
  timeoutMs?: number;
  signal?: AbortSignal;
  /** 网络错误最大重试次数（4xx 永不重试，5xx 最多重试 1 次）。默认 2。 */
  maxRetries?: number;
}

interface ApiErrorBody {
  error?: { message?: string; type?: string; code?: string };
  message?: string;
}

const DEFAULT_TIMEOUT = 60_000;
const DEFAULT_MAX_RETRIES = 2;
const RETRY_BASE_DELAY = 500;
const RETRY_MAX_DELAY = 8_000;

export async function request<T>(opts: RequestOptions): Promise<T> {
  const timeout = opts.timeoutMs ?? DEFAULT_TIMEOUT;
  const maxRetries = opts.maxRetries ?? DEFAULT_MAX_RETRIES;

  let attempt = 0;
  let server5xxRetried = false;
  while (true) {
    try {
      return await doRequest<T>(opts, timeout);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.httpStatus < 500) throw err;
        if (server5xxRetried) throw err;
        server5xxRetried = true;
      } else if (attempt >= maxRetries) {
        throw err;
      }
      attempt += 1;
      const delay = Math.min(RETRY_BASE_DELAY * 2 ** (attempt - 1), RETRY_MAX_DELAY);
      await sleep(delay);
    }
  }
}

async function doRequest<T>(opts: RequestOptions, timeout: number): Promise<T> {
  const ctrl = new AbortController();
  const timeoutErr = new TimeoutError(timeout);
  const timer = setTimeout(() => ctrl.abort(timeoutErr), timeout);
  const onExternalAbort = () => {
    ctrl.abort(opts.signal?.reason);
  };
  opts.signal?.addEventListener('abort', onExternalAbort, { once: true });

  const headers: Record<string, string> = { ...(opts.headers ?? {}) };
  if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`;
  if (opts.bodyKind === 'json' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  // 'form' 模式下不显式设 Content-Type，让 fetch 自动加 multipart boundary

  let res: Response;
  try {
    res = await fetch(opts.url, {
      method: opts.method,
      headers,
      body: opts.body,
      signal: ctrl.signal,
    });
  } catch (err) {
    if (ctrl.signal.aborted && ctrl.signal.reason === timeoutErr) {
      throw timeoutErr;
    }
    throw err;
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener('abort', onExternalAbort);
  }

  if (!res.ok) {
    let body: ApiErrorBody | undefined;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      /* 响应体可能不是 JSON */
    }
    throw new ApiError(
      body?.error?.message ?? body?.message ?? res.statusText ?? `HTTP ${res.status}`,
      res.status,
      body?.error?.code,
      body?.error?.type,
    );
  }
  return (await res.json()) as T;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
