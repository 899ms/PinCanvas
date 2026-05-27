import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

export interface StorageConfig {
  region: string;
  bucket: string;
  endpoint: string;
  publicBaseUrl: string;
  accessKeyId: string;
  secretAccessKey: string;
  namespaceSalt: string;
}

export interface PublicStorageStatus {
  configured: boolean;
  region?: string;
  bucket?: string;
  endpoint?: string;
  publicBaseUrl?: string;
  missing?: string[];
}

interface ConfigFile {
  storage: {
    region: string;
    bucket: string;
    endpoint: string;
    publicBaseUrl: string;
    accessKeyId: string;
    secretAccessKey: string;
    namespaceSalt: string;
  };
}

const STORAGE_ENV_KEYS = [
  'TOS_REGION',
  'TOS_BUCKET',
  'TOS_ENDPOINT',
  'TOS_PUBLIC_BASE_URL',
  'TOS_ACCESS_KEY_ID',
  'TOS_SECRET_ACCESS_KEY',
  'STORAGE_NAMESPACE_SALT',
] as const;

type StorageEnvKey = (typeof STORAGE_ENV_KEYS)[number];

/**
 * 加载存储配置，优先级：
 * 1. server/config.local.json（本地开发，不提交）
 * 2. server/config.json（可选的共享配置）
 * 3. 环境变量（TOS_*）
 */
export function loadStorageConfig(): StorageConfig | null {
  // 1. 尝试从配置文件加载
  const configFromFile = loadConfigFromFile();
  if (configFromFile) return configFromFile;

  // 2. 回退到环境变量
  const env = getStorageEnv();
  const missing = getMissingStorageEnv(env);
  if (missing.length > 0) return null;

  return {
    region: env.TOS_REGION,
    bucket: env.TOS_BUCKET,
    endpoint: env.TOS_ENDPOINT,
    publicBaseUrl: env.TOS_PUBLIC_BASE_URL,
    accessKeyId: env.TOS_ACCESS_KEY_ID,
    secretAccessKey: env.TOS_SECRET_ACCESS_KEY,
    namespaceSalt: env.STORAGE_NAMESPACE_SALT,
  };
}

export function getPublicStorageStatus(): PublicStorageStatus {
  const config = loadStorageConfig();
  if (!config) {
    return { configured: false, missing: ['配置文件或环境变量未设置'] };
  }

  return {
    configured: true,
    region: config.region,
    bucket: config.bucket,
    endpoint: config.endpoint,
    publicBaseUrl: config.publicBaseUrl,
  };
}

function loadConfigFromFile(): StorageConfig | null {
  // 优先加载 config.local.json（本地开发）
  const localConfigPath = join(__dirname, 'config.local.json');
  if (existsSync(localConfigPath)) {
    try {
      const content = readFileSync(localConfigPath, 'utf-8');
      const config: ConfigFile = JSON.parse(content);
      return config.storage;
    } catch (error) {
      console.warn(`Failed to load ${localConfigPath}:`, error);
    }
  }

  // 回退到 config.json（可选的共享配置）
  const configPath = join(__dirname, 'config.json');
  if (existsSync(configPath)) {
    try {
      const content = readFileSync(configPath, 'utf-8');
      const config: ConfigFile = JSON.parse(content);
      return config.storage;
    } catch (error) {
      console.warn(`Failed to load ${configPath}:`, error);
    }
  }

  return null;
}

function getStorageEnv(): Record<StorageEnvKey, string> {
  return {
    TOS_REGION: readEnv('TOS_REGION'),
    TOS_BUCKET: readEnv('TOS_BUCKET'),
    TOS_ENDPOINT: readEnv('TOS_ENDPOINT'),
    TOS_PUBLIC_BASE_URL: readEnv('TOS_PUBLIC_BASE_URL'),
    TOS_ACCESS_KEY_ID: readEnv('TOS_ACCESS_KEY_ID'),
    TOS_SECRET_ACCESS_KEY: readEnv('TOS_SECRET_ACCESS_KEY'),
    STORAGE_NAMESPACE_SALT: readEnv('STORAGE_NAMESPACE_SALT'),
  };
}

function getMissingStorageEnv(env: Record<StorageEnvKey, string>): StorageEnvKey[] {
  return STORAGE_ENV_KEYS.filter((key) => !env[key]);
}

function normalizeEnv(value: string | undefined): string {
  return value?.trim() ?? '';
}

function readEnv(key: StorageEnvKey): string {
  return normalizeEnv(Bun.env[key]);
}
