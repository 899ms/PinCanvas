import type { ProviderAssignment } from './provider';

export type Provider =
  | 'openai'
  | 'jimeng'
  | 'midjourney'
  | 'qwen'
  | 'deepseek'
  | 'yunwu'
  | 'custom';

export type Modality = 'image' | 'video' | 'chat';

export interface ModelParameter {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  defaultValue: string | number | boolean;
  min?: number;
  max?: number;
  step?: number;
  options?: Array<{ label: string; value: string }>;
  description?: string;
}

export interface ModelDef {
  id: string;
  name: string;
  displayName?: string;
  provider: Provider;
  modality: Modality;
  hidden?: boolean;
  supportsEdit?: boolean;
  async?: boolean;
  ratios?: string[];
  resolutions?: string[];
  durations?: string[];
  defaultImageConcurrency?: number;
  group?: string;
  parameters?: ModelParameter[];
  providerAssignment?: ProviderAssignment;
}
