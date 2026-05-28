import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Brush } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { MaskEditor } from '@/components/MaskEditor';
import { useCanvas } from '@/store/canvas';
import type { InputImageNode as InputImageNodeT, NodeId } from '@/types/node';
import { fileToDataURL } from '@/utils/image';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

export function InputImageNodeComp({ id, selected }: NodeProps) {
  const node = useCanvas(
    (s) => s.nodes.find((n) => n.id === (id as NodeId)) as InputImageNodeT | undefined,
  );
  const patchSettings = useCanvas((s) => s.patchSettings);
  const inputRef = useRef<HTMLInputElement>(null);
  const [maskOpen, setMaskOpen] = useState(false);

  const setImage = useCallback(
    async (file: File) => {
      const dataUrl = await fileToDataURL(file);
      patchSettings<'input-image'>(id as NodeId, {
        content: dataUrl,
        filename: file.name,
      });
    },
    [id, patchSettings],
  );

  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void setImage(file);
      e.target.value = '';
    },
    [setImage],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) void setImage(file);
    },
    [setImage],
  );

  if (!node || node.kind !== 'input-image') return null;
  const { settings } = node;
  const hasImage = !!settings.content;
  const hasMask = !!settings.maskContent;

  return (
    <>
      <div
        className={frameClass(selected)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
      >
        <Handle type="source" position={Position.Right} />
        <div className={NODE_HEADER}>
          <span>图片输入</span>
          <span className="ml-auto truncate text-zinc-400">{settings.filename ?? ''}</span>
        </div>
        <div className={`${NODE_BODY} relative flex items-center justify-center bg-zinc-50`}>
          {hasImage ? (
            <>
              <img
                src={settings.content}
                alt={settings.filename ?? ''}
                className="h-full w-full object-contain"
                draggable={false}
              />
              {hasMask && (
                <img
                  src={settings.maskContent ?? ''}
                  alt="mask"
                  className="pointer-events-none absolute inset-0 h-full w-full object-contain opacity-40 mix-blend-screen"
                  draggable={false}
                />
              )}
              <button
                type="button"
                className="nodrag absolute bottom-1 right-1 flex items-center gap-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-zinc-700 shadow hover:bg-white"
                onClick={() => setMaskOpen(true)}
              >
                <Brush className="h-3 w-3" />
                {hasMask ? '编辑蒙版' : '蒙版'}
              </button>
              {hasMask && (
                <button
                  type="button"
                  className="nodrag absolute bottom-1 left-1 rounded bg-white/90 px-1.5 py-0.5 text-[10px] text-zinc-700 shadow hover:bg-white"
                  onClick={() =>
                    patchSettings<'input-image'>(id as NodeId, { maskContent: null })
                  }
                >
                  清除蒙版
                </button>
              )}
            </>
          ) : (
            <button
              type="button"
              className="nodrag rounded-md border border-dashed border-zinc-300 px-3 py-2 text-xs text-zinc-500 hover:border-zinc-400"
              onClick={() => inputRef.current?.click()}
            >
              点击 / 拖入图片
            </button>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
        </div>
      </div>
      {maskOpen && hasImage && (
        <MaskEditor
          imageUrl={settings.content}
          initialMask={settings.maskContent ?? null}
          onSave={(maskUrl) => {
            patchSettings<'input-image'>(id as NodeId, { maskContent: maskUrl });
            setMaskOpen(false);
          }}
          onCancel={() => setMaskOpen(false)}
        />
      )}
    </>
  );
}
