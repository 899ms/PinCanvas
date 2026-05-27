import type { ModelDef } from '@/types/model';
import type { Shot } from '@/types/node';
import { chatComplete } from './chat';

export interface GenerateStoryboardScriptParams {
  scriptText: string;
  llmModel: ModelDef;
  shotCount: number;
  aspectRatio: string;
  apiKey: string;
  baseUrl: string;
  signal?: AbortSignal;
}

interface LLMShotOutput {
  shotNumber: number;
  scene: string;
  startFramePrompt: string;
  endFramePrompt: string;
  action: string;
  duration: number;
}

function newShotId(): string {
  return `shot_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export async function generateStoryboardScript(
  params: GenerateStoryboardScriptParams,
): Promise<Shot[]> {
  const { scriptText, llmModel, shotCount, aspectRatio, apiKey, baseUrl, signal } = params;

  const systemPrompt = `你是一个专业的分镜师。请根据用户提供的剧本内容，生成详细的分镜脚本。

要求：
1. 生成 ${shotCount} 个分镜
2. 每个分镜包含：
   - shotNumber: 镜头编号（从1开始）
   - scene: 场景描述（如"室内-客厅-白天"）
   - startFramePrompt: 首帧画面的详细描述（用于AI图片生成，需要非常详细具体）
   - endFramePrompt: 尾帧画面的详细描述（用于AI图片生成，需要非常详细具体）
   - action: 动作描述（从首帧到尾帧的变化）
   - duration: 时长建议（秒数）

输出格式必须是纯JSON数组，不要包含任何其他文字说明：
[
  {
    "shotNumber": 1,
    "scene": "室内-客厅-白天",
    "startFramePrompt": "一个现代简约的客厅，阳光透过落地窗洒进来，沙发上坐着一个年轻女性，她正在看书，画面宁静温馨",
    "endFramePrompt": "同样的客厅，镜头推进到女性的特写，她抬起头露出微笑，眼神温柔",
    "action": "镜头从全景推进到人物特写",
    "duration": 5
  }
]`;

  const userPrompt = `剧本内容：\n\n${scriptText}`;

  const result = await chatComplete({
    model: llmModel,
    baseUrl,
    apiKey,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    signal,
    timeoutMs: 60000,
  });

  const content = result.choices[0]?.message?.content;
  if (!content) {
    throw new Error('LLM 返回内容为空');
  }

  // 尝试解析 JSON
  let llmShots: LLMShotOutput[];
  try {
    // 移除可能的 markdown 代码块标记
    const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    llmShots = JSON.parse(cleanContent);
  } catch (err) {
    throw new Error(`解析 LLM 输出失败: ${err instanceof Error ? err.message : String(err)}\n\n原始输出:\n${content}`);
  }

  if (!Array.isArray(llmShots)) {
    throw new Error('LLM 输出不是数组格式');
  }

  // 转换为 Shot 格式
  const shots: Shot[] = llmShots.map((llmShot) => ({
    id: newShotId(),
    prompt: llmShot.startFramePrompt, // 兼容旧字段
    scene: llmShot.scene,
    startFramePrompt: llmShot.startFramePrompt,
    endFramePrompt: llmShot.endFramePrompt,
    action: llmShot.action,
    duration: llmShot.duration,
    aspectRatio,
    status: 'idle' as const,
  }));

  return shots;
}
