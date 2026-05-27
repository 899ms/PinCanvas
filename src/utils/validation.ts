/**
 * 验证 URL 格式
 */
export function isValidUrl(url: string): boolean {
  if (!url.trim()) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * 验证 ID 格式（只允许字母、数字、连字符、下划线）
 */
export function isValidId(id: string): boolean {
  return /^[a-zA-Z0-9_-]+$/.test(id);
}

/**
 * 验证模型 ID / 上游模型名。
 * 允许常见模型命名字符，例如 provider/model、model.v1、vendor:model。
 */
export function isValidModelId(id: string): boolean {
  const value = id.trim();
  if (!value || value !== id) return false;
  return /^[^\s<>{}[\]\\|"'`]+$/.test(value);
}

/**
 * 验证必填字段
 */
export function isRequired(value: string | undefined | null): boolean {
  return !!value && value.trim().length > 0;
}

/**
 * 验证数字范围
 */
export function isInRange(value: number, min?: number, max?: number): boolean {
  if (min !== undefined && value < min) return false;
  if (max !== undefined && value > max) return false;
  return true;
}
