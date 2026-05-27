export interface ProviderConfig {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retryCount?: number;
  retryDelay?: number;
  proxyUrl?: string;
  customHeaders?: Record<string, string>;
}

export type ProviderMode = 'reference' | 'inline' | 'global';

export interface ProviderReference {
  mode: 'reference';
  providerId: string;
  overrides?: Partial<Pick<ProviderConfig, 'apiKey' | 'baseUrl'>>;
}

export interface ProviderInline {
  mode: 'inline';
  config: Omit<ProviderConfig, 'id' | 'name'>;
}

export interface ProviderGlobal {
  mode: 'global';
}

export type ProviderAssignment = ProviderReference | ProviderInline | ProviderGlobal;
