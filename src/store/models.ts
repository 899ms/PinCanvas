import { create } from 'zustand';
import type { ModelDef } from '@/types/model';
import { getPref, setPref } from './prefs';
import { clearParameterValues } from '@/utils/modelParams';
import { DEFAULT_MODELS } from '@/api/models';

interface ModelLibraryState {
  userModels: ModelDef[];
  modelOverrides: Record<string, Partial<ModelDef>>;
  upsert: (m: ModelDef) => void;
  remove: (id: string) => void;
  hydrate: () => void;
  exportModels: () => string;
  importModels: (json: string) => { success: boolean; error?: string };
  setOverride: (id: string, override: Partial<ModelDef>) => void;
  clearOverride: (id: string) => void;
  getEffectiveModel: (id: string) => ModelDef | undefined;
}

const STORAGE_KEY = 'model_library';
const OVERRIDES_KEY = 'model_overrides';

export const useModelLibrary = create<ModelLibraryState>((set, get) => ({
  userModels: getPref<ModelDef[]>(STORAGE_KEY, []),
  modelOverrides: getPref<Record<string, Partial<ModelDef>>>(OVERRIDES_KEY, {}),

  upsert: (m) =>
    set((s) => {
      const exists = s.userModels.some((x) => x.id === m.id);
      const next = exists
        ? s.userModels.map((x) => (x.id === m.id ? m : x))
        : [...s.userModels, m];
      setPref(STORAGE_KEY, next);
      return { userModels: next };
    }),

  remove: (id) =>
    set((s) => {
      const model = s.userModels.find((x) => x.id === id);
      if (model?.parameters) {
        clearParameterValues(id, model.parameters);
      }
      const next = s.userModels.filter((x) => x.id !== id);
      setPref(STORAGE_KEY, next);
      return { userModels: next };
    }),

  hydrate: () => {
    set({
      userModels: getPref<ModelDef[]>(STORAGE_KEY, []),
      modelOverrides: getPref<Record<string, Partial<ModelDef>>>(OVERRIDES_KEY, {}),
    });
  },

  exportModels: () => {
    const models = get().userModels;
    return JSON.stringify(models, null, 2);
  },

  importModels: (json: string) => {
    try {
      const models = JSON.parse(json) as ModelDef[];
      if (!Array.isArray(models)) {
        return { success: false, error: '无效的 JSON 格式：期望数组' };
      }
      for (const model of models) {
        if (!model.id || !model.name || !model.provider || !model.modality) {
          return { success: false, error: '模型数据缺少必需字段' };
        }
      }
      set({ userModels: models });
      setPref(STORAGE_KEY, models);
      return { success: true };
    } catch (error) {
      return { success: false, error: `解析失败: ${error}` };
    }
  },

  setOverride: (id, override) =>
    set((s) => {
      const next = { ...s.modelOverrides, [id]: override };
      setPref(OVERRIDES_KEY, next);
      return { modelOverrides: next };
    }),

  clearOverride: (id) =>
    set((s) => {
      const next = { ...s.modelOverrides };
      delete next[id];
      setPref(OVERRIDES_KEY, next);
      return { modelOverrides: next };
    }),

  getEffectiveModel: (id) => {
    const state = get();
    // 先在用户自定义模型中查找
    const userModel = state.userModels.find((m) => m.id === id);
    if (userModel) return userModel;

    // 再在默认模型中查找
    const defaultModel = DEFAULT_MODELS.find((m) => m.id === id);
    if (!defaultModel) return undefined;

    // 如果有覆盖配置，合并
    const override = state.modelOverrides[id];
    if (override) {
      return { ...defaultModel, ...override };
    }

    return defaultModel;
  },
}));
