import { Handle, Position, type NodeProps } from '@xyflow/react';
import { MapPin, Trash2 } from 'lucide-react';
import { useCanvas } from '@/store/canvas';
import { libraryId, useLibrary } from '@/store/library';
import type { CreateSceneNode as CreateSceneNodeT, NodeId } from '@/types/node';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

export function CreateSceneNodeComp({ id, selected }: NodeProps) {
  const nid = id as NodeId;
  const node = useCanvas(
    (s) => s.nodes.find((n) => n.id === nid) as CreateSceneNodeT | undefined,
  );
  const patchSettings = useCanvas((s) => s.patchSettings);
  const scene = useLibrary((s) =>
    node?.settings.sceneId ? s.scenes.find((c) => c.id === node.settings.sceneId) : undefined,
  );
  const upsertScene = useLibrary((s) => s.upsertScene);
  const removeScene = useLibrary((s) => s.removeScene);

  if (!node || node.kind !== 'create-scene') return null;
  const { settings } = node;
  const canSave = settings.name.trim().length > 0;

  const save = () => {
    const sceneId = settings.sceneId ?? libraryId('scene');
    void upsertScene({
      id: sceneId,
      name: settings.name.trim(),
      description: settings.description.trim(),
      prompt: settings.prompt,
      imageUrl: scene?.imageUrl,
      createdAt: scene?.createdAt ?? Date.now(),
    });
    if (!settings.sceneId) {
      patchSettings<'create-scene'>(nid, { sceneId });
    }
  };

  const drop = () => {
    if (!settings.sceneId) return;
    void removeScene(settings.sceneId);
    patchSettings<'create-scene'>(nid, { sceneId: undefined });
  };

  return (
    <div className={frameClass(selected)}>
      <Handle type="source" position={Position.Right} />
      <div className={NODE_HEADER}>
        <MapPin className="h-3 w-3" />
        <span>创建场景</span>
        {scene && <span className="ml-auto text-zinc-400">id={scene.id.slice(-6)}</span>}
      </div>
      <div className={`${NODE_BODY} flex flex-col gap-1.5 overflow-y-auto px-2 py-1.5`}>
        <input
          className="nodrag rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
          placeholder="场景名"
          value={settings.name}
          onChange={(e) => patchSettings<'create-scene'>(nid, { name: e.target.value })}
        />
        <textarea
          className="nodrag h-16 resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
          placeholder="场景描述（环境/氛围/光照/...）"
          value={settings.description}
          onChange={(e) =>
            patchSettings<'create-scene'>(nid, { description: e.target.value })
          }
        />
        <textarea
          className="nodrag h-12 resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
          placeholder="生成 prompt（可选）"
          value={settings.prompt ?? ''}
          onChange={(e) => patchSettings<'create-scene'>(nid, { prompt: e.target.value })}
        />
        {scene?.imageUrl && (
          <img
            src={scene.imageUrl}
            alt={scene.name}
            className="max-h-24 w-full rounded border border-zinc-200 object-contain"
          />
        )}
        <div className="flex gap-1">
          <button
            type="button"
            className="nodrag flex-1 rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-zinc-300"
            disabled={!canSave}
            onClick={save}
          >
            {settings.sceneId ? '更新' : '保存到场景库'}
          </button>
          {settings.sceneId && (
            <button
              type="button"
              className="nodrag rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
              onClick={drop}
              aria-label="从场景库删除"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
