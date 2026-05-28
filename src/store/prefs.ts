const PREFIX = 'pin_';
const LEGACY_PREFIXES = ['ncs_', 'tapnow_'];

export function getPref<T>(key: string, fallback: T): T {
  try {
    const fullKey = PREFIX + key;
    let raw = localStorage.getItem(fullKey);
    if (raw == null) {
      for (const legacyPrefix of LEGACY_PREFIXES) {
        const legacy = localStorage.getItem(legacyPrefix + key);
        if (legacy != null) {
          try {
            localStorage.setItem(fullKey, legacy);
            localStorage.removeItem(legacyPrefix + key);
          } catch {
            /* noop */
          }
          raw = legacy;
          break;
        }
      }
    }
    return raw == null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

export function setPref<T>(key: string, value: T): void {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* 5MB 上限 / 隐私模式：静默丢弃，自动保存会重试下一个 tick */
  }
}

export function removePref(key: string): void {
  try {
    localStorage.removeItem(PREFIX + key);
    for (const legacyPrefix of LEGACY_PREFIXES) {
      localStorage.removeItem(legacyPrefix + key);
    }
  } catch {
    /* noop */
  }
}
