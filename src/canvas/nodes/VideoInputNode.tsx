import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Camera, Trash2 } from 'lucide-react';
import { useCallback, useRef } from 'react';
import { useCanvas } from '@/store/canvas';
import type { NodeId, VideoInputNode as VideoInputNodeT } from '@/types/node';
import { fileToDataURL } from '@/utils/image';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

export function VideoInputNodeComp({ id, selected }: NodeProps) {
  const nid = id as NodeId;
  const node = useCanvas(
    (s) => s.nodes.find((n) => n.id === nid) as VideoInputNodeT | undefined,
  );
  const patchSettings = useCanvas((s) => s.patchSettings);
  const fileRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const setVideo = useCallback(
    async (file: File) => {
      const dataUrl = await fileToDataURL(file);
      patchSettings<'video-input'>(nid, {
        content: dataUrl,
        videoFileName: file.name,
        selectedKeyframes: [],
      });
    },
    [nid, patchSettings],
  );

  const onFile = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) void setVideo(file);
      e.target.value = '';
    },
    [setVideo],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('video/')) void setVideo(file);
    },
    [setVideo],
  );

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const url = canvas.toDataURL('image/png');
    const existing = node?.settings.selectedKeyframes ?? [];
    patchSettings<'video-input'>(nid, {
      selectedKeyframes: [...existing, { time: video.currentTime, url }],
    });
  }, [nid, node?.settings.selectedKeyframes, patchSettings]);

  const removeFrame = useCallback(
    (i: number) => {
      const existing = node?.settings.selectedKeyframes ?? [];
      patchSettings<'video-input'>(nid, {
        selectedKeyframes: existing.filter((_, idx) => idx !== i),
      });
    },
    [nid, node?.settings.selectedKeyframes, patchSettings],
  );

  if (!node || node.kind !== 'video-input') return null;
  const { settings } = node;
  const frames = settings.selectedKeyframes ?? [];

  return (
    <div
      className={frameClass(selected)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
    >
      <Handle type="source" position={Position.Right} />
      <div className={NODE_HEADER}>
        <span>视频输入</span>
        <span className="ml-auto truncate text-zinc-400">{settings.videoFileName ?? ''}</span>
      </div>
      <div className={`${NODE_BODY} flex flex-col gap-1 px-1.5 py-1.5`}>
        {settings.content ? (
          <>
            <video
              ref={videoRef}
              src={settings.content}
              controls
              className="nodrag w-full max-h-32 rounded bg-black object-contain"
            />
            <div className="flex items-center gap-1">
              <button
                type="button"
                className="nodrag flex flex-1 items-center justify-center gap-1 rounded bg-zinc-100 px-1.5 py-1 text-[11px] text-zinc-700 hover:bg-zinc-200"
                onClick={captureFrame}
              >
                <Camera className="h-3 w-3" />
                截取当前帧
              </button>
              <span className="text-[10px] text-zinc-400">{frames.length} 帧</span>
            </div>
            {frames.length > 0 && (
              <div className="flex gap-1 overflow-x-auto">
                {frames.map((f, i) => (
                  <div key={`${f.time}-${i}`} className="relative shrink-0">
                    <img
                      src={f.url}
                      alt=""
                      className="h-10 w-10 rounded border border-zinc-200 object-cover"
                      draggable={false}
                    />
                    <button
                      type="button"
                      className="nodrag absolute -right-1 -top-1 rounded-full bg-white p-0.5 shadow"
                      onClick={() => removeFrame(i)}
                      aria-label="删除帧"
                    >
                      <Trash2 className="h-2.5 w-2.5 text-zinc-600" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <button
            type="button"
            className="nodrag flex h-full items-center justify-center rounded-md border border-dashed border-zinc-300 px-3 py-6 text-xs text-zinc-500 hover:border-zinc-400"
            onClick={() => fileRef.current?.click()}
          >
            点击 / 拖入视频
          </button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={onFile}
        />
      </div>
    </div>
  );
}
