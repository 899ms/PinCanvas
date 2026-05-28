import { DEFAULT_MODELS } from '@/api/models';
import { FIXED_BASE_URL } from '@/api/upstream';
import type { ModelDef } from '@/types/model';
import type { ProviderConfig } from '@/types/provider';
import { getPref, removePref, setPref } from './prefs';

const API_KEY_PARAMS = ['key', 'apiKey', 'api_key'] as const;
const ACCESS_TOKEN_PARAMS = ['access_token', 'accessToken', 'user_token', 'userToken'] as const;
const USER_ID_PARAMS = ['uid', 'user', 'userId', 'user_id'] as const;
const LINK_TS_PARAMS = ['ts', 'timestamp'] as const;
const LINK_SIG_PARAMS = ['sig', 'signature'] as const;
const AUTO_PROVIDER_ID = 'new-api-auto';
const AUTO_PROVIDER_NAME = 'new-api';

/**
 * 从 URL 参数 / 哈希中提取运行时凭证（API Key、用户 ID、签名等），
 * 写入 localStorage 后立即从地址栏移除参数。
 *
 * ⚠️ 安全警告：
 * 通过 URL 传递 API Key 存在显著风险：
 *   - URL 会被浏览器历史记录持久化（即使从地址栏移除）
 *   - 中转的代理、CDN、网关可能记录完整 URL
 *   - HTTP Referer 头可能向第三方泄露
 *   - 浏览器扩展和书签同步可能扩散
 *
 * 仅在以下场景使用：
 *   - 受信任的同源跳转（公司内部 SSO、自托管网关）
 *   - 测试环境的便利登录
 *
 * 生产环境应优先使用：
 *   - 用户在设置面板手动粘贴 Key
 *   - 服务端代理 + 短时 token
 *   - 浏览器扩展安全地注入凭证
 */
export function importRuntimeConfigFromUrl(): boolean {
  if (typeof window === 'undefined') return false;

  const config = findRuntimeConfig(window.location);
  if (!hasRuntimeConfig(config)) return false;

  if (config.apiKey) {
    setPref('global_key', config.apiKey);
    setPref('global_base_url', FIXED_BASE_URL);
    upsertAutoProvider(config.apiKey);
    bindDefaultModelsToAutoProvider();
  }
  removePref('access_token');
  if (config.userId) setPref('user_id', config.userId);
  if (config.userId) mergeRuntimeUserSession(config);
  if (config.linkTs) setPref('link_ts', config.linkTs);
  if (config.linkSig) setPref('link_sig', config.linkSig);
  removeRuntimeConfigFromAddressBar(window.location, window.history);
  return true;
}

interface RuntimeConfig {
  apiKey: string | null;
  accessToken: string | null;
  userId: string | null;
  linkTs: string | null;
  linkSig: string | null;
}

function findRuntimeConfig(location: Location): RuntimeConfig {
  return mergeRuntimeConfig(
    findRuntimeConfigInHash(location.hash),
    findRuntimeConfigInParams(new URLSearchParams(location.search)),
  );
}

function findRuntimeConfigInHash(hash: string): RuntimeConfig {
  const content = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!content) return emptyRuntimeConfig();

  const queryStart = content.indexOf('?');
  const paramText = queryStart >= 0 ? content.slice(queryStart + 1) : content;
  return findRuntimeConfigInParams(new URLSearchParams(paramText));
}

function findRuntimeConfigInParams(params: URLSearchParams): RuntimeConfig {
  return {
    apiKey: findFirstParam(params, API_KEY_PARAMS),
    accessToken: findFirstParam(params, ACCESS_TOKEN_PARAMS),
    userId: findFirstParam(params, USER_ID_PARAMS),
    linkTs: findFirstParam(params, LINK_TS_PARAMS),
    linkSig: findFirstParam(params, LINK_SIG_PARAMS),
  };
}

function findFirstParam(
  params: URLSearchParams,
  names: readonly string[],
): string | null {
  for (const name of names) {
    const value = params.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

function mergeRuntimeConfig(primary: RuntimeConfig, fallback: RuntimeConfig): RuntimeConfig {
  return {
    apiKey: primary.apiKey ?? fallback.apiKey,
    accessToken: primary.accessToken ?? fallback.accessToken,
    userId: primary.userId ?? fallback.userId,
    linkTs: primary.linkTs ?? fallback.linkTs,
    linkSig: primary.linkSig ?? fallback.linkSig,
  };
}

function emptyRuntimeConfig(): RuntimeConfig {
  return {
    apiKey: null,
    accessToken: null,
    userId: null,
    linkTs: null,
    linkSig: null,
  };
}

function hasRuntimeConfig(config: RuntimeConfig): boolean {
  return Boolean(
    config.apiKey || config.accessToken || config.userId || config.linkTs || config.linkSig,
  );
}

function mergeRuntimeUserSession(config: RuntimeConfig): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const raw = localStorage.getItem('user');
    const current = raw ? JSON.parse(raw) : {};
    const user = current && typeof current === 'object' && !Array.isArray(current) ? current : {};
    localStorage.setItem(
      'user',
      JSON.stringify({
        ...user,
        ...(config.userId ? { id: parseUserId(config.userId) } : {}),
      }),
    );
  } catch {
    localStorage.setItem(
      'user',
      JSON.stringify({
        ...(config.userId ? { id: parseUserId(config.userId) } : {}),
      }),
    );
  }
}

function parseUserId(value: string): string | number {
  const numeric = Number(value);
  return Number.isInteger(numeric) && String(numeric) === value ? numeric : value;
}

function removeRuntimeConfigFromAddressBar(location: Location, history: History): void {
  const url = new URL(location.href);
  let changed = removeRuntimeConfigParams(url.searchParams);

  if (url.hash) {
    const nextHash = removeRuntimeConfigFromHash(url.hash);
    if (nextHash !== url.hash) {
      url.hash = nextHash;
      changed = true;
    }
  }

  if (changed) history.replaceState(history.state, document.title, url);
}

function removeRuntimeConfigFromHash(hash: string): string {
  const content = hash.startsWith('#') ? hash.slice(1) : hash;
  const queryStart = content.indexOf('?');
  const hasRoutePrefix = queryStart >= 0;
  const prefix = hasRoutePrefix ? content.slice(0, queryStart) : '';
  const paramText = hasRoutePrefix ? content.slice(queryStart + 1) : content;
  const params = new URLSearchParams(paramText);

  if (!removeRuntimeConfigParams(params)) return hash;

  const nextParams = params.toString();
  if (hasRoutePrefix) return nextParams ? `#${prefix}?${nextParams}` : `#${prefix}`;
  return nextParams ? `#${nextParams}` : '';
}

function removeRuntimeConfigParams(params: URLSearchParams): boolean {
  let changed = false;
  for (const name of [
    ...API_KEY_PARAMS,
    ...ACCESS_TOKEN_PARAMS,
    ...USER_ID_PARAMS,
    ...LINK_TS_PARAMS,
    ...LINK_SIG_PARAMS,
  ]) {
    if (!params.has(name)) continue;
    params.delete(name);
    changed = true;
  }
  return changed;
}

function upsertAutoProvider(apiKey: string): void {
  const providers = getPref<ProviderConfig[]>('provider_library', []);
  const autoProvider: ProviderConfig = {
    id: AUTO_PROVIDER_ID,
    name: AUTO_PROVIDER_NAME,
    baseUrl: FIXED_BASE_URL,
    apiKey,
  };
  const exists = providers.some((provider) => provider.id === AUTO_PROVIDER_ID);
  const next = exists
    ? providers.map((provider) =>
        provider.id === AUTO_PROVIDER_ID
          ? {
              ...provider,
              name: provider.name || AUTO_PROVIDER_NAME,
              baseUrl: FIXED_BASE_URL,
              apiKey,
            }
          : provider,
      )
    : [...providers, autoProvider];
  setPref('provider_library', next);
}

function bindDefaultModelsToAutoProvider(): void {
  const overrides = getPref<Record<string, Partial<ModelDef>>>('model_overrides', {});
  let changed = false;
  const next: Record<string, Partial<ModelDef>> = { ...overrides };

  for (const model of DEFAULT_MODELS) {
    const override = next[model.id] ?? {};
    if (hasManualProviderBinding(override)) continue;
    next[model.id] = {
      ...override,
      providerAssignment: {
        mode: 'reference',
        providerId: AUTO_PROVIDER_ID,
      },
    };
    changed = true;
  }

  if (changed) setPref('model_overrides', next);
}

function hasManualProviderBinding(override: Partial<ModelDef>): boolean {
  const assignment = override.providerAssignment;
  if (!assignment || assignment.mode === 'global') return false;
  if (assignment.mode === 'reference') {
    return assignment.providerId !== AUTO_PROVIDER_ID;
  }
  return true;
}
