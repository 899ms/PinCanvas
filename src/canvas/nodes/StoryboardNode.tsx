import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Film, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import { generateImage } from '@/api/images';
import { importImageUrlMaterial, uploadImageMaterial } from '@/api/media';
import { getModelDef } from '@/api/models';
import type { Vars } from '@/api/template';
import { FIXED_BASE_URL, normalizeImageModelId } from '@/api/upstream';
import { FEATURE_DISABLED_MESSAGE } from '@/config/features';
import { useModels } from '@/hooks/useModels';
import { useCanvas } from '@/store/canvas';
import { getPref } from '@/store/prefs';
import { useTasks } from '@/store/tasks';
import { urlToBlob } from '@/utils/image';
import type { NodeId, Shot, StoryboardNodeT } from '@/types/node';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

const RATIO_OPTIONS = ['16:9', '1:1', '9:16', '4:3', '3:4'];
function newShotId(): string {
  return `shot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

async function persistShotImage(url: string): Promise<string> {
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    const blob = await urlToBlob(url);
    return uploadImageMaterial(blob, 'storyboard-shot.png');
  }
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return importImageUrlMaterial(url, 'storyboard-shot.png');
  }
  throw new Error('不支持的分镜图片地址');
}

export function StoryboardNodeComp({ id, selected }: NodeProps) {
  const nid = id as NodeId;
  const node = useCanvas(
    (s) => s.nodes.find((n) => n.id === nid) as StoryboardNodeT | undefined,
  );
  const patchSettings = useCanvas((s) => s.patchSettings);
  const enqueue = useTasks((s) => s.enqueue);
  const IMAGE_MODELS = useModels('image');
  const VIDEO_MODELS = useModels('video');

  if (!node || node.kind !== 'storyboard-node') return null;
  const { settings } = node;

  const setShots = (shots: Shot[]) => {
    patchSettings<'storyboard-node'>(nid, { shots });
  };

  const patchShot = (index: number, patch: Partial<Shot>) => {
    const current = useCanvas
      .getState()
      .nodes.find((n) => n.id === nid) as StoryboardNodeT | undefined;
    if (!current) return;
    const shots = current.settings.shots.map((s, i) =>
      i === index ? { ...s, ...patch } : s,
    );
    patchSettings<'storyboard-node'>(nid, { shots });
  };

  const addShot = () => {
    setShots([
      ...settings.shots,
      { id: newShotId(), prompt: '', aspectRatio: '16:9', status: 'idle' },
    ]);
  };

  const removeShot = (index: number) => {
    setShots(settings.shots.filter((_, i) => i !== index));
  };

  const generateShotImage = (index: number) => {
    patchShot(index, { status: 'generating', errorMsg: undefined });
    enqueue(nid, async () => {
      try {
        const apiKey = String(getPref('global_key', ''));
        if (!apiKey) throw new Error('API Key 未配置');
        const baseUrl = FIXED_BASE_URL;
        const cur = useCanvas.getState().nodes.find((n) => n.id === nid) as
          | StoryboardNodeT
          | undefined;
        const shot = cur?.settings.shots[index];
        if (!cur || !shot) throw new Error('shot 已被删除');
        const modelId = normalizeImageModelId(cur.settings.imageModel);
        const model = getModelDef(modelId);
        if (!model) throw new Error(`未知图片模型: ${modelId}`);
        if (!shot.prompt.trim()) throw new Error('shot prompt 为空');
        const vars: Vars = {
          modelName: model.name,
          prompt: shot.prompt,
          n: 1,
          size: '1024x1024',
          ratio: shot.aspectRatio ?? '16:9',
          quality: 'standard',
          enableSequential: false,
        };
        const result = await generateImage({
          model,
          baseUrl,
          apiKey,
          vars,
          ctx: { hasReferenceImages: false, hasMask: false, useJimengLocalFile: false },
        });
        const url = result.data[0]?.url;
        const b64 = result.data[0]?.b64_json;
          const content = url ?? (b64 ? `data:image/png;base64,${b64}` : undefined);
          if (!content) throw new Error('生成结果无 url / b64_json');
        patchShot(index, { status: 'done', imageUrl: await persistShotImage(content) });
      } catch (err) {
        patchShot(index, {
          status: 'failed',
          errorMsg: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  const generateShotVideo = (index: number) => {
    patchShot(index, {
      status: 'idle',
      errorMsg: FEATURE_DISABLED_MESSAGE,
    });
    window.alert(FEATURE_DISABLED_MESSAGE);
  };

  return (
    <div className={frameClass(selected)}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className={NODE_HEADER}>
        <span>分镜</span>
        <span className="ml-auto text-zinc-400">{settings.shots.length} shots</span>
      </div>
      <div className={`${NODE_BODY} flex flex-col gap-1.5 overflow-y-auto px-2 py-1.5`}>
        <div className="flex gap-1">
          <select
            className="nodrag flex-1 rounded border border-zinc-200 bg-white px-1.5 py-1 text-[11px]"
            value={normalizeImageModelId(settings.imageModel)}
            onChange={(e) =>
              patchSettings<'storyboard-node'>(nid, { imageModel: e.target.value })
            }
            title="图片模型"
          >
            {IMAGE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                img · {m.id}
              </option>
            ))}
          </select>
          <select
            className="nodrag flex-1 rounded border border-zinc-200 bg-white px-1.5 py-1 text-[11px]"
            value={settings.videoModel}
            onChange={(e) =>
              patchSettings<'storyboard-node'>(nid, { videoModel: e.target.value })
            }
            title="视频模型"
            disabled
          >
            {VIDEO_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                vid · {m.id}
              </option>
            ))}
          </select>
        </div>

        {settings.shots.map((shot, i) => {
          const busy = shot.status === 'generating';
          return (
            <div
              key={shot.id}
              className="flex flex-col gap-1 rounded border border-zinc-200 bg-zinc-50 p-1.5"
            >
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-zinc-600">#{i + 1}</span>
                <select
                  className="nodrag rounded border border-zinc-200 bg-white px-1 py-0.5 text-[10px]"
                  value={shot.aspectRatio ?? '16:9'}
                  onChange={(e) => patchShot(i, { aspectRatio: e.target.value })}
                  disabled={busy}
                >
                  {RATIO_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <input
                  className="nodrag w-12 rounded border border-zinc-200 bg-white px-1 py-0.5 text-[10px]"
                  placeholder="5s"
                  value={String(shot.duration ?? '')}
                  onChange={(e) => patchShot(i, { duration: e.target.value })}
                  disabled={busy}
                />
                <span className="ml-auto text-[10px] text-zinc-400">
                  {shot.status === 'done' ? '✓' : shot.status === 'failed' ? '✗' : busy ? '…' : ''}
                </span>
                <button
                  type="button"
                  className="nodrag rounded p-0.5 text-zinc-400 hover:bg-zinc-200 hover:text-zinc-700"
                  onClick={() => removeShot(i)}
                  aria-label="删除"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
              <textarea
                className="nodrag h-12 resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 text-[11px]"
                placeholder={`shot ${i + 1} prompt`}
                value={shot.prompt}
                onChange={(e) => patchShot(i, { prompt: e.target.value })}
                disabled={busy}
              />
              <div className="flex items-center gap-1">
                {shot.imageUrl && (
                  <img
                    src={shot.imageUrl}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded border border-zinc-200 object-cover"
                  />
                )}
                {shot.videoUrl && (
                  <video
                    src={shot.videoUrl}
                    className="h-12 w-16 shrink-0 rounded border border-zinc-200 bg-black object-contain"
                    controls
                  />
                )}
                <div className="ml-auto flex gap-1">
                  <button
                    type="button"
                    className="nodrag flex items-center gap-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] text-white hover:bg-blue-700 disabled:bg-zinc-300"
                    disabled={busy || !shot.prompt.trim()}
                    onClick={() => generateShotImage(i)}
                  >
                    <ImageIcon className="h-2.5 w-2.5" />
                    图
                  </button>
                  <button
                    type="button"
                    className="nodrag flex items-center gap-1 rounded bg-purple-600 px-1.5 py-0.5 text-[10px] text-white hover:bg-purple-700 disabled:bg-zinc-300"
                    disabled
                    title={FEATURE_DISABLED_MESSAGE}
                    onClick={() => generateShotVideo(i)}
                  >
                    <Film className="h-2.5 w-2.5" />
                    即将上线
                  </button>
                </div>
              </div>
              {shot.errorMsg && (
                <div className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700">
                  {shot.errorMsg}
                </div>
              )}
            </div>
          );
        })}

        <button
          type="button"
          className="nodrag flex items-center justify-center gap-1 rounded border border-dashed border-zinc-300 px-2 py-1.5 text-[11px] text-zinc-500 hover:border-zinc-400 hover:bg-zinc-50"
          onClick={addShot}
        >
          <Plus className="h-3 w-3" />
          添加 shot
        </button>
      </div>
    </div>
  );
}
