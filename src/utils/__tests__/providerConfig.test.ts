import { afterEach, describe, expect, it } from 'vitest';
import type { ModelDef } from '@/types/model';
import { resolveProviderConfig } from '../providerConfig';

const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    clear: () => storage.clear(),
  },
  configurable: true,
});

const videoModel: ModelDef = {
  id: 'seedance-2',
  name: 'seedance-2',
  provider: 'openai',
  modality: 'video',
};

describe('resolveProviderConfig', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('falls back to provider library when global config is empty', () => {
    localStorage.setItem(
      'tapnow_provider_library',
      JSON.stringify([
        {
          id: 'new-api',
          name: 'new-api',
          baseUrl: 'https://new-api.example.com',
          apiKey: 'sk-test',
        },
      ]),
    );

    expect(resolveProviderConfig(videoModel)).toMatchObject({
      baseUrl: 'https://new-api.example.com',
      apiKey: 'sk-test',
    });
  });
});
