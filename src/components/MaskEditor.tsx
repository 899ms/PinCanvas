import { Eraser, Save, Trash2, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface Props {
  imageUrl: string;
  initialMask?: string | null;
  onSave: (maskDataUrl: string) => void;
  onCancel: () => void;
}

type Mode = 'draw' | 'erase';

export function MaskEditor({ imageUrl, initialMask, onSave, onCancel }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const drawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);

  const [brushSize, setBrushSize] = useState(40);
  const [mode, setMode] = useState<Mode>('draw');
  const [imgReady, setImgReady] = useState(false);

  // 图片加载后初始化 canvas
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const onLoad = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = 'black';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      if (initialMask) {
        const i2 = new Image();
        i2.crossOrigin = 'anonymous';
        i2.onload = () => ctx.drawImage(i2, 0, 0);
        i2.src = initialMask;
      }
      setImgReady(true);
    };
    if (img.complete && img.naturalWidth > 0) onLoad();
    else img.addEventListener('load', onLoad, { once: true });
    return () => {
      img.removeEventListener('load', onLoad);
    };
  }, [imageUrl, initialMask]);

  // Esc 取消
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const toCanvasXY = useCallback((e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * sx,
      y: (e.clientY - rect.top) * sy,
    };
  }, []);

  const stroke = useCallback(
    (from: { x: number; y: number } | null, to: { x: number; y: number }) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const color = mode === 'draw' ? 'white' : 'black';
      ctx.strokeStyle = color;
      ctx.fillStyle = color;
      ctx.lineWidth = brushSize;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      if (from) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(to.x, to.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
      }
    },
    [brushSize, mode],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    drawingRef.current = true;
    const p = toCanvasXY(e);
    if (p) {
      stroke(null, p);
      lastPointRef.current = p;
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawingRef.current) return;
    const p = toCanvasXY(e);
    if (!p) return;
    stroke(lastPointRef.current, p);
    lastPointRef.current = p;
  };
  const onPointerUp = () => {
    drawingRef.current = false;
    lastPointRef.current = null;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    onSave(canvas.toDataURL('image/png'));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/85">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-zinc-900 px-4 py-2 text-sm text-zinc-100">
        <div className="flex items-center gap-3">
          <span className="font-medium">蒙版编辑器</span>
          <span className="text-xs text-zinc-400">白色区域 = 要编辑的部分</span>
        </div>
        <div className="flex items-center gap-2">
          <ToolBtn active={mode === 'draw'} onClick={() => setMode('draw')}>
            画笔
          </ToolBtn>
          <ToolBtn active={mode === 'erase'} onClick={() => setMode('erase')}>
            <Eraser className="h-3.5 w-3.5" />
            擦除
          </ToolBtn>
          <label className="flex items-center gap-1.5 text-xs">
            笔刷
            <input
              type="range"
              min={5}
              max={150}
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
            />
            <span className="w-6 text-right tabular-nums">{brushSize}</span>
          </label>
          <button
            type="button"
            className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800"
            onClick={handleClear}
          >
            <Trash2 className="h-3.5 w-3.5" />
            清除
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded border border-zinc-700 px-2 py-1 text-xs hover:bg-zinc-800"
            onClick={onCancel}
          >
            <X className="h-3.5 w-3.5" />
            取消
          </button>
          <button
            type="button"
            className="flex items-center gap-1 rounded bg-blue-600 px-3 py-1 text-xs font-medium hover:bg-blue-700 disabled:bg-zinc-700"
            onClick={handleSave}
            disabled={!imgReady}
          >
            <Save className="h-3.5 w-3.5" />
            保存
          </button>
        </div>
      </div>
      <div className="flex flex-1 items-center justify-center overflow-auto p-4">
        <div className="relative inline-block">
          <img
            ref={imgRef}
            src={imageUrl}
            alt=""
            className="block max-h-[80vh] max-w-full select-none"
            draggable={false}
          />
          <canvas
            ref={canvasRef}
            className="absolute inset-0 h-full w-full cursor-crosshair opacity-50 touch-none"
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          />
        </div>
      </div>
    </div>
  );
}

interface ToolBtnProps {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}
function ToolBtn({ active, onClick, children }: ToolBtnProps) {
  return (
    <button
      type="button"
      className={`flex items-center gap-1 rounded border px-2 py-1 text-xs ${
        active
          ? 'border-blue-500 bg-blue-600 text-white'
          : 'border-zinc-700 text-zinc-200 hover:bg-zinc-800'
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
