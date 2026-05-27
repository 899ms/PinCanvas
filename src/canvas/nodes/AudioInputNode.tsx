import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Music, Upload } from 'lucide-react';
import { useCallback, useRef } from 'react';
import { useCanvas } from '@/store/canvas';
import type { AudioInputNode as AudioInputNodeT, NodeId } from '@/types/node';
import { fileToDataURL } from '@/utils/image';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

export function AudioInputNodeComp({ id, selected }: NodeProps) {
  const nid = id as NodeId;
  const node = useCanvas(
    (s) => s.nodes.find((n) => n.id === nid) as AudioInputNodeT | undefined,
  );
  const patchSettings = useCanvas((s) => s.patchSettings);
  const fileRef = useRef<HTMLInputElement>(null);

  const setAudio = useCallback(
    async (file: File) => {
      const dataUrl = await fileToDataURL(file);
      patchSettings<'audio-input'>(nid, {
        content: dataUrl,
        filename: file.name,
        mimeType: file.type,
      });
    },
    [nid, patchSettings],
  );

  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void setAudio(file);
      e.target.value = '';
    },
    [setAudio],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('audio/')) void setAudio(file);
    },
    [setAudio],
  );

  if (!node || node.kind !== 'audio-input') return null;
  const { settings } = node;

  return (
    <div
      className={frameClass(selected)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <Handle type="source" position={Position.Right} />
      <div className={NODE_HEADER}>
        <span>音频输入</span>
        <span className="ml-auto truncate text-zinc-400">{settings.filename ?? ''}</span>
      </div>
      <div className={`${NODE_BODY} flex flex-col justify-center gap-2 px-2 py-2`}>
        {settings.content ? (
          <>
            <div className="flex items-center gap-2 rounded-md bg-zinc-50 px-2 py-2">
              <Music className="h-4 w-4 shrink-0 text-zinc-500" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-zinc-700">
                  {settings.filename ?? '音频文件'}
                </div>
                <div className="truncate text-[10px] text-zinc-400">
                  {settings.mimeType ?? 'audio'}
                </div>
              </div>
            </div>
            <audio src={settings.content} controls className="nodrag w-full" />
            <button
              type="button"
              className="nodrag rounded bg-zinc-100 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-200"
              onClick={() => fileRef.current?.click()}
            >
              更换音频
            </button>
          </>
        ) : (
          <button
            type="button"
            className="nodrag flex h-full min-h-[86px] flex-col items-center justify-center gap-2 rounded-md border border-dashed border-zinc-300 px-3 py-4 text-xs text-zinc-500 hover:border-zinc-400"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="h-4 w-4" />
            点击 / 拖入音频
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={onFile}
        />
      </div>
    </div>
  );
}
