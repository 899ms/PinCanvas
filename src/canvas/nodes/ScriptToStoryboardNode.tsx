import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Film, Image as ImageIcon, Sparkles, Trash2 } from 'lucide-react';
import { generateImage } from '@/api/images';
import { importImageUrlMaterial, uploadImageMaterial } from '@/api/media';
import { getModelDef } from '@/api/models';
import { generateStoryboardScript } from '@/api/storyboard';
import type { Vars } from '@/api/template';
import { FIXED_BASE_URL, normalizeImageModelId } from '@/api/upstream';
import { useModels } from '@/hooks/useModels';
import { useCanvas } from '@/store/canvas';
import { getPref } from '@/store/prefs';
import { useTasks } from '@/store/tasks';
import type { NodeId, ScriptToStoryboardNode as ScriptNodeT, Shot } from '@/types/node';
import { urlToBlob } from '@/utils/image';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

const RATIO_OPTIONS = ['16:9', '1:1', '9:16', '4:3', '3:4'];

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

export function ScriptToStoryboardNodeComp({ id, selected }: NodeProps) {
  const nid = id as NodeId;
  const node = useCanvas(
    (s) => s.nodes.find((n) => n.id === nid) as ScriptNodeT | undefined,
  );
  const patchSettings = useCanvas((s) => s.patchSettings);
  const enqueue = useTasks((s) => s.enqueue);
  const IMAGE_MODELS = useModels('image');

  if (!node || node.kind !== 'script-to-storyboard') return null;
  const { settings } = node;

  // 固定使用 MiniMax-M2.5
  const FIXED_LLM_MODEL = 'MiniMax-M2.5';

  const setShots = (shots: Shot[]) => {
    patchSettings<'script-to-storyboard'>(nid, { shots });
  };

  const patchShot = (index: number, patch: Partial<Shot>) => {
    const current = useCanvas
      .getState()
      .nodes.find((n) => n.id === nid) as ScriptNodeT | undefined;
    if (!current) return;
    const shots = current.settings.shots.map((s, i) =>
      i === index ? { ...s, ...patch } : s,
    );
    patchSettings<'script-to-storyboard'>(nid, { shots });
  };

  const removeShot = (index: number) => {
    setShots(settings.shots.filter((_, i) => i !== index));
  };

  // 生成分镜脚本
  const generateScript = () => {
    patchSettings<'script-to-storyboard'>(nid, {
      isGenerating: true,
      error: null,
      progress: 0,
    });
    enqueue(nid, async () => {
      try {
        const apiKey = String(getPref('global_key', ''));
        if (!apiKey) throw new Error('API Key 未配置');
        const baseUrl = FIXED_BASE_URL;

        const cur = useCanvas.getState().nodes.find((n) => n.id === nid) as
          | ScriptNodeT
          | undefined;
        if (!cur) throw new Error('节点已被删除');

        if (!cur.settings.scriptText.trim()) {
          throw new Error('请输入剧本内容');
        }

        // 使用固定的 MiniMax-M2.5 模型
        const llmModel = getModelDef(FIXED_LLM_MODEL);
        if (!llmModel) throw new Error(`未知 LLM 模型: ${FIXED_LLM_MODEL}`);

        const shots = await generateStoryboardScript({
          scriptText: cur.settings.scriptText,
          llmModel,
          shotCount: cur.settings.shotCount || 6,
          aspectRatio: cur.settings.aspectRatio || '16:9',
          apiKey,
          baseUrl,
        });

        patchSettings<'script-to-storyboard'>(nid, {
          shots,
          isGenerating: false,
          progress: 100,
        });
      } catch (err) {
        patchSettings<'script-to-storyboard'>(nid, {
          isGenerating: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  // 生成首帧
  const generateStartFrame = (index: number) => {
    patchShot(index, { status: 'generating-start', errorMsg: undefined });
    enqueue(nid, async () => {
      try {
        const apiKey = String(getPref('global_key', ''));
        if (!apiKey) throw new Error('API Key 未配置');
        const baseUrl = FIXED_BASE_URL;

        const cur = useCanvas.getState().nodes.find((n) => n.id === nid) as
          | ScriptNodeT
          | undefined;
        const shot = cur?.settings.shots[index];
        if (!cur || !shot) throw new Error('shot 已被删除');

        const modelId = normalizeImageModelId(cur.settings.imageModel);
        const model = getModelDef(modelId);
        if (!model) throw new Error(`未知图片模型: ${modelId}`);

        if (!shot.startFramePrompt?.trim()) {
          throw new Error('首帧提示词为空');
        }

        const vars: Vars = {
          modelName: model.name,
          prompt: shot.startFramePrompt,
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

        patchShot(index, {
          status: 'idle',
          startFrameUrl: await persistShotImage(content),
        });
      } catch (err) {
        patchShot(index, {
          status: 'failed',
          errorMsg: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  // 生成尾帧
  const generateEndFrame = (index: number) => {
    patchShot(index, { status: 'generating-end', errorMsg: undefined });
    enqueue(nid, async () => {
      try {
        const apiKey = String(getPref('global_key', ''));
        if (!apiKey) throw new Error('API Key 未配置');
        const baseUrl = FIXED_BASE_URL;

        const cur = useCanvas.getState().nodes.find((n) => n.id === nid) as
          | ScriptNodeT
          | undefined;
        const shot = cur?.settings.shots[index];
        if (!cur || !shot) throw new Error('shot 已被删除');

        const modelId = normalizeImageModelId(cur.settings.imageModel);
        const model = getModelDef(modelId);
        if (!model) throw new Error(`未知图片模型: ${modelId}`);

        if (!shot.endFramePrompt?.trim()) {
          throw new Error('尾帧提示词为空');
        }

        // 构建增强提示词
        let enhancedPrompt = shot.endFramePrompt;
        if (shot.action) {
          enhancedPrompt = `${shot.endFramePrompt}\n\n动作变化: ${shot.action}`;
        }

        const vars: Vars = {
          modelName: model.name,
          prompt: enhancedPrompt,
          n: 1,
          size: '1024x1024',
          ratio: shot.aspectRatio ?? '16:9',
          quality: 'standard',
          enableSequential: false,
        };

        // 如果有首帧，作为参考图
        if (shot.startFrameUrl) {
          vars.imageUrls = [shot.startFrameUrl];
        }

        const result = await generateImage({
          model,
          baseUrl,
          apiKey,
          vars,
          ctx: {
            hasReferenceImages: !!shot.startFrameUrl,
            hasMask: false,
            useJimengLocalFile: false,
          },
        });

        const url = result.data[0]?.url;
        const b64 = result.data[0]?.b64_json;
        const content = url ?? (b64 ? `data:image/png;base64,${b64}` : undefined);
        if (!content) throw new Error('生成结果无 url / b64_json');

        patchShot(index, {
          status: 'done',
          endFrameUrl: await persistShotImage(content),
        });
      } catch (err) {
        patchShot(index, {
          status: 'failed',
          errorMsg: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  // 批量生成所有首帧
  const generateAllStartFrames = () => {
    settings.shots.forEach((_, i) => {
      if (!settings.shots[i].startFrameUrl) {
        generateStartFrame(i);
      }
    });
  };

  // 批量生成所有尾帧
  const generateAllEndFrames = () => {
    settings.shots.forEach((_, i) => {
      if (settings.shots[i].startFrameUrl && !settings.shots[i].endFrameUrl) {
        generateEndFrame(i);
      }
    });
  };

  const isBusy = settings.isGenerating;
  const hasShots = settings.shots.length > 0;

  return (
    <div className={frameClass(selected)} style={{ width: 400 }}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className={NODE_HEADER}>
        <Sparkles className="h-3 w-3" />
        <span>剧本转分镜</span>
        <span className="ml-auto text-zinc-400">{settings.shots.length} shots</span>
      </div>
      <div className={`${NODE_BODY} flex flex-col gap-1.5 overflow-y-auto px-2 py-1.5`}>
        {/* 配置区 */}
        <div className="flex gap-1">
          <div className="flex flex-1 items-center gap-1 rounded border border-zinc-200 bg-zinc-50 px-1.5 py-1 text-[11px] text-zinc-600">
            <span className="font-medium">LLM:</span>
            <span>{FIXED_LLM_MODEL}</span>
          </div>
          <select
            className="nodrag flex-1 rounded border border-zinc-200 bg-white px-1.5 py-1 text-[11px]"
            value={normalizeImageModelId(settings.imageModel)}
            onChange={(e) =>
              patchSettings<'script-to-storyboard'>(nid, { imageModel: e.target.value })
            }
            title="图片模型"
            disabled={isBusy}
          >
            {IMAGE_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                IMG · {m.id}
              </option>
            ))}
          </select>
        </div>

        {/* 剧本输入 */}
        <textarea
          className="nodrag h-32 resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
          placeholder="输入剧本内容..."
          value={settings.scriptText}
          onChange={(e) =>
            patchSettings<'script-to-storyboard'>(nid, { scriptText: e.target.value })
          }
          disabled={isBusy}
        />

        {/* 生成配置 */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1 text-[11px] text-zinc-600">
            分镜数:
            <input
              type="number"
              className="nodrag w-12 rounded border border-zinc-200 bg-white px-1 py-0.5 text-[11px]"
              value={settings.shotCount || 6}
              onChange={(e) =>
                patchSettings<'script-to-storyboard'>(nid, {
                  shotCount: parseInt(e.target.value) || 6,
                })
              }
              min={1}
              max={20}
              disabled={isBusy}
            />
          </label>
          <select
            className="nodrag rounded border border-zinc-200 bg-white px-1 py-0.5 text-[10px]"
            value={settings.aspectRatio || '16:9'}
            onChange={(e) =>
              patchSettings<'script-to-storyboard'>(nid, { aspectRatio: e.target.value })
            }
            disabled={isBusy}
          >
            {RATIO_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <label className="ml-auto flex items-center gap-1 text-[11px] text-zinc-600">
            <input
              type="checkbox"
              className="nodrag"
              checked={settings.generateEndFrame}
              onChange={(e) =>
                patchSettings<'script-to-storyboard'>(nid, {
                  generateEndFrame: e.target.checked,
                })
              }
              disabled={isBusy}
            />
            生成尾帧
          </label>
        </div>

        {/* 生成按钮 */}
        <button
          type="button"
          className="nodrag flex items-center justify-center gap-1 rounded bg-blue-600 px-2 py-1.5 text-xs text-white hover:bg-blue-700 disabled:bg-zinc-300"
          onClick={generateScript}
          disabled={isBusy || !settings.scriptText.trim()}
        >
          <Sparkles className="h-3 w-3" />
          {isBusy ? '生成中...' : '生成分镜脚本'}
        </button>

        {/* 错误提示 */}
        {settings.error && (
          <div className="rounded bg-red-50 px-1.5 py-1 text-[11px] text-red-700">
            {settings.error}
          </div>
        )}

        {/* 批量操作按钮 */}
        {hasShots && (
          <div className="flex gap-1">
            <button
              type="button"
              className="nodrag flex-1 rounded border border-blue-600 bg-white px-2 py-1 text-[10px] text-blue-600 hover:bg-blue-50"
              onClick={generateAllStartFrames}
            >
              批量生成首帧
            </button>
            {settings.generateEndFrame && (
              <button
                type="button"
                className="nodrag flex-1 rounded border border-purple-600 bg-white px-2 py-1 text-[10px] text-purple-600 hover:bg-purple-50"
                onClick={generateAllEndFrames}
              >
                批量生成尾帧
              </button>
            )}
          </div>
        )}

        {/* 分镜列表 */}
        {settings.shots.map((shot, i) => {
          const busy =
            shot.status === 'generating-start' || shot.status === 'generating-end';
          return (
            <div
              key={shot.id}
              className="flex flex-col gap-1 rounded border border-zinc-200 bg-zinc-50 p-1.5"
            >
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-zinc-600">#{i + 1}</span>
                {shot.scene && (
                  <span className="text-[10px] text-zinc-500">{shot.scene}</span>
                )}
                <span className="ml-auto text-[10px] text-zinc-400">
                  {shot.status === 'done'
                    ? '✓'
                    : shot.status === 'failed'
                      ? '✗'
                      : busy
                        ? '…'
                        : ''}
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

              {/* 首帧 */}
              <div className="flex flex-col gap-0.5">
                <div className="text-[10px] font-medium text-zinc-600">首帧</div>
                <textarea
                  className="nodrag h-12 resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 text-[10px]"
                  placeholder="首帧提示词"
                  value={shot.startFramePrompt || ''}
                  onChange={(e) => patchShot(i, { startFramePrompt: e.target.value })}
                  disabled={busy}
                />
                <div className="flex items-center gap-1">
                  {shot.startFrameUrl && (
                    <img
                      src={shot.startFrameUrl}
                      alt="首帧"
                      className="h-16 w-16 shrink-0 rounded border border-zinc-200 object-cover"
                    />
                  )}
                  <button
                    type="button"
                    className="nodrag ml-auto flex items-center gap-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] text-white hover:bg-blue-700 disabled:bg-zinc-300"
                    disabled={busy || !shot.startFramePrompt?.trim()}
                    onClick={() => generateStartFrame(i)}
                  >
                    <ImageIcon className="h-2.5 w-2.5" />
                    生成首帧
                  </button>
                </div>
              </div>

              {/* 动作描述 */}
              {shot.action && (
                <div className="rounded bg-zinc-100 px-1.5 py-1 text-[10px] text-zinc-600">
                  <span className="font-medium">动作:</span> {shot.action}
                </div>
              )}

              {/* 尾帧 */}
              {settings.generateEndFrame && (
                <div className="flex flex-col gap-0.5">
                  <div className="text-[10px] font-medium text-zinc-600">尾帧</div>
                  <textarea
                    className="nodrag h-12 resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 text-[10px]"
                    placeholder="尾帧提示词"
                    value={shot.endFramePrompt || ''}
                    onChange={(e) => patchShot(i, { endFramePrompt: e.target.value })}
                    disabled={busy}
                  />
                  <div className="flex items-center gap-1">
                    {shot.endFrameUrl && (
                      <img
                        src={shot.endFrameUrl}
                        alt="尾帧"
                        className="h-16 w-16 shrink-0 rounded border border-zinc-200 object-cover"
                      />
                    )}
                    <button
                      type="button"
                      className="nodrag ml-auto flex items-center gap-1 rounded bg-purple-600 px-1.5 py-0.5 text-[10px] text-white hover:bg-purple-700 disabled:bg-zinc-300"
                      disabled={busy || !shot.endFramePrompt?.trim() || !shot.startFrameUrl}
                      onClick={() => generateEndFrame(i)}
                      title={!shot.startFrameUrl ? '请先生成首帧' : ''}
                    >
                      <Film className="h-2.5 w-2.5" />
                      生成尾帧
                    </button>
                  </div>
                </div>
              )}

              {shot.errorMsg && (
                <div className="rounded bg-red-50 px-1.5 py-0.5 text-[10px] text-red-700">
                  {shot.errorMsg}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
