import { Handle, Position, type NodeProps } from '@xyflow/react';
import { normalizeImageModelId } from '@/api/upstream';
import { useGenerationTrigger } from '@/hooks/useGenerationTrigger';
import { useModels } from '@/hooks/useModels';
import { useCanvas } from '@/store/canvas';
import { useLibrary } from '@/store/library';
import { useNodeTask } from '@/store/tasks';
import type { GenerateCharacterImageNode as GenCharImgNodeT, NodeId } from '@/types/node';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

const RATIO_OPTIONS = ['1:1', '16:9', '9:16', '4:3', '3:4'];

export function GenerateCharacterImageNodeComp({ id, selected }: NodeProps) {
  const nid = id as NodeId;
  const IMAGE_MODELS = useModels('image');
  const node = useCanvas(
    (s) => s.nodes.find((n) => n.id === nid) as GenCharImgNodeT | undefined,
  );
  const patchSettings = useCanvas((s) => s.patchSettings);
  const characters = useLibrary((s) => s.characters);
  const character = useLibrary((s) =>
    node?.settings.characterId
      ? s.characters.find((c) => c.id === node.settings.characterId)
      : undefined,
  );
  const task = useNodeTask(nid);
  const trigger = useGenerationTrigger();

  if (!node || node.kind !== 'generate-character-image') return null;
  const { settings } = node;
  const isBusy = task?.status === 'pending' || task?.status === 'running';
  const model = normalizeImageModelId(settings.model);

  return (
    <div className={frameClass(selected)}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className={NODE_HEADER}>
        <span>角色形象</span>
        <span className="ml-auto truncate text-zinc-400">
          {character ? character.name : '未选择'}
        </span>
      </div>
      <div className={`${NODE_BODY} flex flex-col gap-1.5 overflow-y-auto px-2 py-1.5`}>
        <select
          className="nodrag rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
          value={settings.characterId ?? ''}
          onChange={(e) =>
            patchSettings<'generate-character-image'>(nid, {
              characterId: e.target.value || undefined,
            })
          }
          disabled={isBusy}
        >
          <option value="">— 选择角色 —</option>
          {characters.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select
          className="nodrag rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
          value={model}
          onChange={(e) =>
            patchSettings<'generate-character-image'>(nid, { model: e.target.value })
          }
          disabled={isBusy}
        >
          {IMAGE_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id}
            </option>
          ))}
        </select>
        <textarea
          className="nodrag h-12 resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
          placeholder="附加 prompt（可选，留空用角色 prompt/description）"
          value={settings.prompt ?? ''}
          onChange={(e) =>
            patchSettings<'generate-character-image'>(nid, { prompt: e.target.value })
          }
          disabled={isBusy}
        />
        <select
          className="nodrag rounded border border-zinc-200 bg-white px-1.5 py-1 text-[11px]"
          value={settings.ratio ?? '1:1'}
          onChange={(e) =>
            patchSettings<'generate-character-image'>(nid, { ratio: e.target.value })
          }
          disabled={isBusy}
        >
          {RATIO_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        {node.content && (
          <img
            src={node.content}
            alt=""
            className="max-h-32 w-full rounded border border-zinc-200 object-contain"
            draggable={false}
          />
        )}
        {task?.error && (
          <div className="rounded bg-red-50 px-1.5 py-1 text-[11px] text-red-700">
            {task.error}
          </div>
        )}
        <button
          type="button"
          className="nodrag rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-zinc-300"
          disabled={isBusy || !settings.characterId}
          onClick={() => trigger(nid)}
        >
          {isBusy ? '生成中…' : '生成形象'}
        </button>
      </div>
    </div>
  );
}
