import type { ModelDef } from '@/types/model';
import type { ProviderConfig } from '@/types/provider';
import { getPref } from '@/store/prefs';

export interface ResolvedProviderConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  proxyUrl?: string;
  customHeaders?: Record<string, string>;
}

/**
 * 根据模型的服务商配置模式，解析出最终的服务商配置
 */
export function resolveProviderConfig(model: ModelDef): ResolvedProviderConfig | null {
  const assignment = model.providerAssignment;

  // 模式1: 使用全局配置
  if (!assignment || assignment.mode === 'global') {
    const globalBaseUrl = getPref<string>('global_base_url', '');
    const globalApiKey = getPref<string>('global_key', '');
    if (!globalBaseUrl || !globalApiKey) {
      return resolveProviderLibraryFallback(model);
    }
    return {
      baseUrl: globalBaseUrl,
      apiKey: globalApiKey,
    };
  }

  // 模式2: 引用已配置的服务商
  if (assignment.mode === 'reference') {
    const providers = getPref<ProviderConfig[]>('provider_library', []);
    const provider = providers.find((p) => p.id === assignment.providerId);
    if (!provider) {
      return null;
    }
    return {
      baseUrl: assignment.overrides?.baseUrl || provider.baseUrl,
      apiKey: assignment.overrides?.apiKey || provider.apiKey,
      timeout: provider.timeout,
      retryCount: provider.retryCount,
      retryDelay: provider.retryDelay,
      proxyUrl: provider.proxyUrl,
      customHeaders: provider.customHeaders,
    };
  }

  // 模式3: 直接内联配置
  if (assignment.mode === 'inline') {
    const { baseUrl, apiKey, timeout, retryCount, retryDelay, proxyUrl, customHeaders } =
      assignment.config;
    if (!baseUrl || !apiKey) {
      return null;
    }
    return {
      baseUrl,
      apiKey,
      timeout,
      retryCount,
      retryDelay,
      proxyUrl,
      customHeaders,
    };
  }

  return null;
}

function resolveProviderLibraryFallback(model: ModelDef): ResolvedProviderConfig | null {
  const providers = getPref<ProviderConfig[]>('provider_library', []).filter(
    (provider) => provider.baseUrl && provider.apiKey,
  );
  if (providers.length === 0) return null;

  const provider =
    providers.find((item) => item.id === model.provider) ||
    providers.find((item) => item.id.toLowerCase().includes(model.provider)) ||
    providers.find((item) => item.name.toLowerCase().includes(model.provider)) ||
    providers[0];

  return {
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    timeout: provider.timeout,
    retryCount: provider.retryCount,
    retryDelay: provider.retryDelay,
    proxyUrl: provider.proxyUrl,
    customHeaders: provider.customHeaders,
  };
}
