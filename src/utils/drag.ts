export const HISTORY_IMAGE_DRAG_MIME = 'application/x-node-canvas-history-image';

export interface HistoryImageDragPayload {
  url: string;
  filename?: string;
}

export function setHistoryImageDragData(
  dataTransfer: DataTransfer,
  payload: HistoryImageDragPayload,
): void {
  dataTransfer.effectAllowed = 'copy';
  dataTransfer.setData(HISTORY_IMAGE_DRAG_MIME, JSON.stringify(payload));
  dataTransfer.setData('text/uri-list', payload.url);
  dataTransfer.setData('text/plain', payload.url);
}

export function getHistoryImageDragData(
  dataTransfer: DataTransfer,
): HistoryImageDragPayload | null {
  const raw = dataTransfer.getData(HISTORY_IMAGE_DRAG_MIME);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<HistoryImageDragPayload>;
    if (typeof parsed.url !== 'string' || parsed.url.length === 0) return null;
    return {
      url: parsed.url,
      filename: typeof parsed.filename === 'string' ? parsed.filename : undefined,
    };
  } catch {
    return null;
  }
}

export function hasHistoryImageDragData(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes(HISTORY_IMAGE_DRAG_MIME);
}
