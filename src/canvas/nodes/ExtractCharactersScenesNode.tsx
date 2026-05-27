import { Handle, Position, type NodeProps } from '@xyflow/react';
import { ArrowRight, BookOpen } from 'lucide-react';
import { useGenerationTrigger } from '@/hooks/useGenerationTrigger';
import { useModels } from '@/hooks/useModels';
import { useUpstream } from '@/hooks/useUpstream';
import { useCanvas } from '@/store/canvas';
import { libraryId, useLibrary } from '@/store/library';
import { useNodeTask } from '@/store/tasks';
import type {
  ExtractCharactersScenesNode as ExtractNodeT,
  NodeId,
} from '@/types/node';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

export function ExtractCharactersScenesNodeComp({ id, selected }: NodeProps) {
  const nid = id as NodeId;
  const CHAT_MODELS = useModels('chat');
  const node = useCanvas(
    (s) => s.nodes.find((n) => n.id === nid) as ExtractNodeT | undefined,
  );
  const patchSettings = useCanvas((s) => s.patchSettings);
  const upstream = useUpstream(nid);
  const task = useNodeTask(nid);
  const trigger = useGenerationTrigger();
  const upsertCharacter = useLibrary((s) => s.upsertCharacter);
  const upsertScene = useLibrary((s) => s.upsertScene);

  if (!node || node.kind !== 'extract-characters-scenes') return null;
  const { settings } = node;
  const isBusy = task?.status === 'pending' || task?.status === 'running';
  const effectiveSource = upstream.prompt || settings.sourceText || '';

  const importCharacter = (c: { name: string; description: string }) => {
    void upsertCharacter({
      id: libraryId('char'),
      name: c.name,
      description: c.description,
      createdAt: Date.now(),
    });
  };
  const importScene = (s: { name: string; description: string }) => {
    void upsertScene({
      id: libraryId('scene'),
      name: s.name,
      description: s.description,
      createdAt: Date.now(),
    });
  };
  const importAllCharacters = () => {
    settings.characters?.forEach(importCharacter);
  };
  const importAllScenes = () => {
    settings.scenes?.forEach(importScene);
  };

  return (
    <div className={frameClass(selected)}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className={NODE_HEADER}>
        <BookOpen className="h-3 w-3" />
        <span>抽取角色 / 场景</span>
        <span className="ml-auto truncate text-zinc-400">{settings.model}</span>
      </div>
      <div className={`${NODE_BODY} flex flex-col gap-1.5 overflow-y-auto px-2 py-1.5`}>
        <select
          className="nodrag rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
          value={settings.model}
          onChange={(e) =>
            patchSettings<'extract-characters-scenes'>(nid, { model: e.target.value })
          }
          disabled={isBusy}
        >
          {CHAT_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id}
            </option>
          ))}
        </select>
        {upstream.prompt ? (
          <div className="rounded border border-zinc-200 bg-zinc-50 px-1.5 py-1 text-[11px] text-zinc-600">
            上游文本（{upstream.prompt.length} 字）：
            <div className="mt-1 max-h-20 overflow-y-auto whitespace-pre-wrap text-zinc-700">
              {upstream.prompt.slice(0, 400)}
              {upstream.prompt.length > 400 ? '…' : ''}
            </div>
          </div>
        ) : (
          <textarea
            className="nodrag h-24 resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
            placeholder="粘贴小说全文（或连一个上游 text 节点）"
            value={settings.sourceText ?? ''}
            onChange={(e) =>
              patchSettings<'extract-characters-scenes'>(nid, { sourceText: e.target.value })
            }
            disabled={isBusy}
          />
        )}

        {(settings.characters?.length || settings.scenes?.length) && (
          <div className="flex flex-col gap-1 rounded border border-zinc-200 bg-zinc-50 p-1.5">
            {settings.characters && settings.characters.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600">
                  <span>角色 ({settings.characters.length})</span>
                  <button
                    type="button"
                    className="nodrag text-blue-600 hover:underline"
                    onClick={importAllCharacters}
                  >
                    全部入库
                  </button>
                </div>
                {settings.characters.map((c, i) => (
                  <div key={`c${i}`} className="flex items-center gap-1.5 rounded bg-white px-1.5 py-1">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-zinc-800">{c.name}</div>
                      <div className="truncate text-[11px] text-zinc-500">{c.description}</div>
                    </div>
                    <button
                      type="button"
                      className="nodrag rounded p-0.5 text-zinc-500 hover:bg-zinc-100"
                      onClick={() => importCharacter(c)}
                      aria-label="入库"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {settings.scenes && settings.scenes.length > 0 && (
              <div className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-zinc-600">
                  <span>场景 ({settings.scenes.length})</span>
                  <button
                    type="button"
                    className="nodrag text-blue-600 hover:underline"
                    onClick={importAllScenes}
                  >
                    全部入库
                  </button>
                </div>
                {settings.scenes.map((sc, i) => (
                  <div key={`s${i}`} className="flex items-center gap-1.5 rounded bg-white px-1.5 py-1">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-xs font-medium text-zinc-800">{sc.name}</div>
                      <div className="truncate text-[11px] text-zinc-500">{sc.description}</div>
                    </div>
                    <button
                      type="button"
                      className="nodrag rounded p-0.5 text-zinc-500 hover:bg-zinc-100"
                      onClick={() => importScene(sc)}
                      aria-label="入库"
                    >
                      <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {task?.error && (
          <div className="rounded bg-red-50 px-1.5 py-1 text-[11px] text-red-700">
            {task.error}
          </div>
        )}
        <button
          type="button"
          className="nodrag rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:bg-zinc-300"
          disabled={isBusy || !effectiveSource.trim()}
          onClick={() => trigger(nid)}
        >
          {isBusy ? '抽取中…' : '抽取'}
        </button>
      </div>
    </div>
  );
}
