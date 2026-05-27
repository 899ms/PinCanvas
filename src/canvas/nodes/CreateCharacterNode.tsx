import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Trash2, Users } from 'lucide-react';
import { useCanvas } from '@/store/canvas';
import { libraryId, useLibrary } from '@/store/library';
import type { CreateCharacterNode as CreateCharacterNodeT, NodeId } from '@/types/node';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

export function CreateCharacterNodeComp({ id, selected }: NodeProps) {
  const nid = id as NodeId;
  const node = useCanvas(
    (s) => s.nodes.find((n) => n.id === nid) as CreateCharacterNodeT | undefined,
  );
  const patchSettings = useCanvas((s) => s.patchSettings);
  const character = useLibrary((s) =>
    node?.settings.characterId ? s.characters.find((c) => c.id === node.settings.characterId) : undefined,
  );
  const upsertCharacter = useLibrary((s) => s.upsertCharacter);
  const removeCharacter = useLibrary((s) => s.removeCharacter);

  if (!node || node.kind !== 'create-character') return null;
  const { settings } = node;

  const canSave = settings.name.trim().length > 0;

  const save = () => {
    const charId = settings.characterId ?? libraryId('char');
    void upsertCharacter({
      id: charId,
      name: settings.name.trim(),
      description: settings.description.trim(),
      prompt: settings.prompt,
      imageUrl: character?.imageUrl,
      createdAt: character?.createdAt ?? Date.now(),
    });
    if (!settings.characterId) {
      patchSettings<'create-character'>(nid, { characterId: charId });
    }
  };

  const drop = () => {
    if (!settings.characterId) return;
    void removeCharacter(settings.characterId);
    patchSettings<'create-character'>(nid, { characterId: undefined });
  };

  return (
    <div className={frameClass(selected)}>
      <Handle type="source" position={Position.Right} />
      <div className={NODE_HEADER}>
        <Users className="h-3 w-3" />
        <span>创建角色</span>
        {character && <span className="ml-auto text-zinc-400">id={character.id.slice(-6)}</span>}
      </div>
      <div className={`${NODE_BODY} flex flex-col gap-1.5 overflow-y-auto px-2 py-1.5`}>
        <input
          className="nodrag rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
          placeholder="角色名"
          value={settings.name}
          onChange={(e) => patchSettings<'create-character'>(nid, { name: e.target.value })}
        />
        <textarea
          className="nodrag h-16 resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
          placeholder="角色描述（外貌/性格/...）"
          value={settings.description}
          onChange={(e) =>
            patchSettings<'create-character'>(nid, { description: e.target.value })
          }
        />
        <textarea
          className="nodrag h-12 resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
          placeholder="生成 prompt（可选，留空用 description）"
          value={settings.prompt ?? ''}
          onChange={(e) => patchSettings<'create-character'>(nid, { prompt: e.target.value })}
        />
        {character?.imageUrl && (
          <img
            src={character.imageUrl}
            alt={character.name}
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
            {settings.characterId ? '更新' : '保存到角色库'}
          </button>
          {settings.characterId && (
            <button
              type="button"
              className="nodrag rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-100"
              onClick={drop}
              aria-label="从角色库删除"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
