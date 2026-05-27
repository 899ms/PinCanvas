import { Handle, Position, type NodeProps } from '@xyflow/react';
import { MessageSquare, Send } from 'lucide-react';
import { chatComplete } from '@/api/chat';
import { getModelDef } from '@/api/models';
import { FIXED_BASE_URL } from '@/api/upstream';
import { useModels } from '@/hooks/useModels';
import { useCanvas } from '@/store/canvas';
import { getPref } from '@/store/prefs';
import { useTasks } from '@/store/tasks';
import type { ChatNode as ChatNodeT, NodeId } from '@/types/node';
import { frameClass, NODE_BODY, NODE_HEADER } from './shared';

export function ChatNodeComp({ id, selected }: NodeProps) {
  const nid = id as NodeId;
  const node = useCanvas(
    (s) => s.nodes.find((n) => n.id === nid) as ChatNodeT | undefined,
  );
  const patchSettings = useCanvas((s) => s.patchSettings);
  const enqueue = useTasks((s) => s.enqueue);
  const CHAT_MODELS = useModels('chat');

  if (!node || node.kind !== 'chat') return null;
  const { settings } = node;

  const sendMessage = () => {
    patchSettings<'chat'>(nid, { isGenerating: true, error: null });
    enqueue(nid, async () => {
      try {
        const apiKey = String(getPref('global_key', ''));
        if (!apiKey) throw new Error('API Key 未配置');
        const baseUrl = FIXED_BASE_URL;

        const cur = useCanvas.getState().nodes.find((n) => n.id === nid) as
          | ChatNodeT
          | undefined;
        if (!cur) throw new Error('节点已被删除');

        if (!cur.settings.userMessage.trim()) {
          throw new Error('请输入消息');
        }

        const model = getModelDef(cur.settings.model);
        if (!model) throw new Error(`未知模型: ${cur.settings.model}`);

        const messages = [];
        if (cur.settings.systemPrompt?.trim()) {
          messages.push({
            role: 'system' as const,
            content: cur.settings.systemPrompt,
          });
        }
        messages.push({
          role: 'user' as const,
          content: cur.settings.userMessage,
        });

        const result = await chatComplete({
          model,
          baseUrl,
          apiKey,
          messages,
          timeoutMs: 60000,
        });

        const response = result.choices[0]?.message?.content;
        if (!response) {
          throw new Error('LLM 返回内容为空');
        }

        patchSettings<'chat'>(nid, {
          response,
          isGenerating: false,
        });
      } catch (err) {
        patchSettings<'chat'>(nid, {
          isGenerating: false,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    });
  };

  const isBusy = settings.isGenerating;

  return (
    <div className={frameClass(selected)} style={{ width: 380 }}>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
      <div className={NODE_HEADER}>
        <MessageSquare className="h-3 w-3" />
        <span>对话</span>
        <span className="ml-auto truncate text-zinc-400">{settings.model}</span>
      </div>
      <div className={`${NODE_BODY} flex flex-col gap-1.5 overflow-y-auto px-2 py-1.5`}>
        {/* 模型选择 */}
        <select
          className="nodrag rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
          value={settings.model}
          onChange={(e) => patchSettings<'chat'>(nid, { model: e.target.value })}
          disabled={isBusy}
        >
          {CHAT_MODELS.map((m) => (
            <option key={m.id} value={m.id}>
              {m.id}
            </option>
          ))}
        </select>

        {/* 系统提示词 */}
        <details className="group">
          <summary className="cursor-pointer text-[11px] font-medium text-zinc-600 hover:text-zinc-800">
            系统提示词 (可选)
          </summary>
          <textarea
            className="nodrag mt-1 h-16 w-full resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
            placeholder="设置 AI 的角色和行为..."
            value={settings.systemPrompt || ''}
            onChange={(e) => patchSettings<'chat'>(nid, { systemPrompt: e.target.value })}
            disabled={isBusy}
          />
        </details>

        {/* 用户消息 */}
        <textarea
          className="nodrag h-24 resize-none rounded border border-zinc-200 bg-white px-1.5 py-1 text-xs"
          placeholder="输入你的消息..."
          value={settings.userMessage}
          onChange={(e) => patchSettings<'chat'>(nid, { userMessage: e.target.value })}
          disabled={isBusy}
        />

        {/* 发送按钮 */}
        <button
          type="button"
          className="nodrag flex items-center justify-center gap-1 rounded bg-blue-600 px-2 py-1.5 text-xs text-white hover:bg-blue-700 disabled:bg-zinc-300"
          onClick={sendMessage}
          disabled={isBusy || !settings.userMessage.trim()}
        >
          <Send className="h-3 w-3" />
          {isBusy ? '生成中...' : '发送'}
        </button>

        {/* 错误提示 */}
        {settings.error && (
          <div className="rounded bg-red-50 px-1.5 py-1 text-[11px] text-red-700">
            {settings.error}
          </div>
        )}

        {/* AI 响应 */}
        {settings.response && (
          <div className="flex flex-col gap-1">
            <div className="text-[11px] font-medium text-zinc-600">AI 响应:</div>
            <div className="max-h-60 overflow-y-auto rounded border border-zinc-200 bg-zinc-50 px-1.5 py-1 text-xs text-zinc-700 whitespace-pre-wrap">
              {settings.response}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
