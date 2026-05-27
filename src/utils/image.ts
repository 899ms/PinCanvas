export function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

/**
 * 把任意 URL（含 dataURL / blob: / http(s)）转 Blob。
 * 跨域 http(s) 会受浏览器 CORS 限制——M5+ 加本地缓存代理时再处理。
 */
export async function urlToBlob(url: string): Promise<Blob> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: HTTP ${res.status}`);
  return res.blob();
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(blob);
  });
}

export async function urlToDataURL(url: string): Promise<string> {
  if (url.startsWith('data:')) return url;
  const blob = await urlToBlob(url);
  return blobToDataURL(blob);
}

export async function downloadUrl(url: string, filename: string): Promise<void> {
  if (!shouldFetchBeforeDownload(url)) {
    triggerDirectDownload(url, filename);
    return;
  }

  try {
    const blob = await urlToBlob(url);
    const objectUrl = URL.createObjectURL(blob);
    try {
      triggerDirectDownload(objectUrl, filename);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    triggerDirectDownload(url, filename);
  }
}

export function imageFilename(prefix: string, index?: number): string {
  const suffix = typeof index === 'number' ? `-${index + 1}` : '';
  return `${prefix}${suffix}-${Date.now()}.png`;
}

function shouldFetchBeforeDownload(url: string): boolean {
  if (url.startsWith('data:') || url.startsWith('blob:')) return true;
  try {
    return new URL(url, window.location.href).origin === window.location.origin;
  } catch {
    return false;
  }
}

function triggerDirectDownload(url: string, filename: string): void {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}
