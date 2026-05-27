import { create } from 'zustand';
import type { ProviderConfig } from '@/types/provider';
import { getPref, setPref } from './prefs';

interface ProviderLibraryState {
  providers: ProviderConfig[];
  upsert: (p: ProviderConfig) => void;
  remove: (id: string) => void;
  getById: (id: string) => ProviderConfig | undefined;
  hydrate: () => void;
  exportProviders: () => string;
  importProviders: (json: string) => { success: boolean; error?: string };
}

const STORAGE_KEY = 'provider_library';

export const useProviderLibrary = create<ProviderLibraryState>((set, get) => ({
  providers: getPref<ProviderConfig[]>(STORAGE_KEY, []),

  upsert: (p) =>
    set((s) => {
      const exists = s.providers.some((x) => x.id === p.id);
      const next = exists
        ? s.providers.map((x) => (x.id === p.id ? p : x))
        : [...s.providers, p];
      setPref(STORAGE_KEY, next);
      return { providers: next };
    }),

  remove: (id) =>
    set((s) => {
      const next = s.providers.filter((x) => x.id !== id);
      setPref(STORAGE_KEY, next);
      return { providers: next };
    }),

  getById: (id) => {
    return get().providers.find((p) => p.id === id);
  },

  hydrate: () => {
    set({ providers: getPref<ProviderConfig[]>(STORAGE_KEY, []) });
  },

  exportProviders: () => {
    const providers = get().providers;
    return JSON.stringify(providers, null, 2);
  },

  importProviders: (json: string) => {
    try {
      const providers = JSON.parse(json) as ProviderConfig[];
      if (!Array.isArray(providers)) {
        return { success: false, error: '无效的 JSON 格式：期望数组' };
      }
      for (const provider of providers) {
        if (!provider.id || !provider.name || !provider.baseUrl || !provider.apiKey) {
          return { success: false, error: '服务商数据缺少必需字段' };
        }
      }
      set({ providers });
      setPref(STORAGE_KEY, providers);
      return { success: true };
    } catch (error) {
      return { success: false, error: `解析失败: ${error}` };
    }
  },
}));
