export const NODE_FRAME =
  'flex h-full w-full flex-col overflow-hidden rounded-lg border-2 bg-white shadow-sm transition-colors';
export const NODE_BORDER_IDLE = 'border-zinc-200';
export const NODE_BORDER_SELECTED = 'border-blue-500';
export const NODE_HEADER =
  'flex shrink-0 items-center gap-1.5 border-b border-zinc-100 bg-zinc-50 px-2 py-1.5 text-xs font-medium text-zinc-700';
export const NODE_BODY = 'min-h-0 flex-1 overflow-hidden';

export function frameClass(selected: boolean | undefined): string {
  return `${NODE_FRAME} ${selected ? NODE_BORDER_SELECTED : NODE_BORDER_IDLE}`;
}
