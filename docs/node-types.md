# 节点类型与 settings schema

所有节点的 TS 判别联合。重写时按本表生成 `src/types/node.ts`。

## 0. 公共字段

```ts
interface NodeBase {
  id: string;
  type: NodeType;
  title?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 运行态预览输出（图片 URL / dataURL / 视频 URL） */
  content?: string | null;
  /** Midjourney 专属 */
  mjImages?: string[];
  mjNeedsSplit?: boolean;
  mjOriginalUrl?: string;
  /** 最近保存时间，用于"未保存"标记 */
  lastSaved?: number;
}
```

## 1. 节点类型枚举与默认尺寸

| `type` | 用途 | 默认 (w×h) |
|---|---|---|
| `input-image` | 本地 / URL 图片输入 | 自适应缩略图 |
| `gen-image` | 文生图 / 图生图 | 动态：340 + (n-1)×36，上限 860 |
| `gen-video` | 文生视频 / 图生视频 | 动态：420 + (n-1)×36，上限 900 |
| `video-input` | 视频输入 + 抽帧 | 自适应 |
| `preview` | 预览（终端节点） | 320×260 |
| `text-node` | 纯文本 | — |
| `novel-input` | 小说全文输入 | — |
| `storyboard-node` | 分镜（含多 shot） | — |
| `video-analyze` | 视频理解 | 480×500 |
| `image-compare` | 图片对比 / 混合 | 400×300 |
| `create-character` | 角色创建 | 350×300 |
| `create-scene` | 场景创建 | 350×300 |
| `character-description` | 角色描述模板 | 400×400 |
| `scene-description` | 场景描述模板 | 400×400 |
| `generate-character-image` | 由角色生成形象 | 400×450 |
| `generate-character-video` | 由角色生成视频 | 400×450 |
| `generate-scene-image` | 由场景生成概念图 | 400×450 |
| `generate-scene-video` | 由场景生成视频 | 400×450 |
| `extract-characters-scenes` | 从小说抽角色 / 场景 | 400×500 |
| `shot-model` | 单镜头模型配置 | — |
| `extract-model` | 抽取模型配置 | — |
| `analyze-model` | 分析模型配置 | — |
| `batch-download` | 批量下载 | — |
| `local-save` | 本地服务保存 | 320×380 |
| `storyboard-as-video` | 分镜 → 视频序列 | — |
| `storyboard-download` | 分镜下载 | — |

> 重写时 M2 先支持前 6 种（input-image、gen-image、gen-video、preview、text-node、video-input）。其余 M5+ 渐进补齐。

## 2. 连接点语义

所有节点遵循统一的数据流方向：**左侧为输入，右侧为输出**。

- 左侧连接点只表示当前节点接收的上游素材 / 引用 / 配置 / 文本输入。
- 右侧连接点只表示当前节点产出的下游结果。
- 画布连线语义始终是 `source -> target`，视觉上对应 `上游节点右侧输出 -> 下游节点左侧输入`。
- 输入素材类节点（如 `input-image`、`text-node`、`video-input`）本身通常只需要右侧输出连接点，用于把素材传给下游。
- 处理 / 生成类节点（如 `gen-image`、`gen-video`、`video-analyze`、`extract-characters-scenes`）通常同时具备左侧输入和右侧输出。
- 终端展示类节点（如 `preview`）通常只需要左侧输入连接点。
- 新增节点时不得把素材输入 handle 放在右侧，也不得把产物输出 handle 放在左侧。

该规则优先于单个节点的视觉便利性；如果某节点需要多个输入类型，应在左侧通过 handle 类型或节点内部 UI 区分，而不是改变左右语义。

## 3. settings 判别联合（TS 草稿）

```ts
export type NodeSettings =
  | InputImageSettings
  | GenImageSettings
  | GenVideoSettings
  | VideoInputSettings
  | PreviewSettings
  | TextNodeSettings
  | NovelInputSettings
  | StoryboardSettings
  | ImageCompareSettings
  | CreateCharacterSettings
  | CreateSceneSettings
  | GenerateCharacterImageSettings
  | GenerateCharacterVideoSettings
  | GenerateSceneImageSettings
  | GenerateSceneVideoSettings
  | ExtractCharactersScenesSettings
  | VideoAnalyzeSettings
  | LocalSaveSettings;

interface InputImageSettings {
  kind: 'input-image';
  /** dataURL 或远端 URL */
  content: string;
  filename?: string;
  width?: number;
  height?: number;
}

interface GenImageSettings {
  kind: 'gen-image';
  prompt: string;
  model: string;
  /** "16:9" / "1:1" / "9:16" ... */
  ratio?: string;
  imageRatio?: string;
  /** "1024x1024" / "2K" / "1080p" */
  resolution?: string;
  imageResolution?: string;
  referenceImages?: string[];
  /** 至多 5 张，与 referenceImages 二选一时优先用此 */
  image_url?: string;
  image_filename?: string;
  image_size?: string;
  /** Inpainting 蒙版：dataURL 或 blob URL */
  maskContent?: string | null;
  useMultiRef?: boolean;
  /** 'image_url' | 'first' | 'last' | 'lastFrame' */
  activeInput?: 'image_url' | 'first' | 'last' | 'lastFrame';
  /** 自定义参数（透传到 API） */
  customParams?: Array<{ name: string; value: unknown; override?: boolean }>;
  apiConfig?: ApiOverride;
  imageConcurrency?: number;
  concurrentImages?: number;
  /** 同 concurrentImages，一次生成 N 张 */
  n?: number;
  /** 'standard' | 'hd'（仅 dall-e 等） */
  quality?: string;
  /** 运行态 */
  isGenerating?: boolean;
  isEnhancing?: boolean;
  generationStartTime?: number;
  status?: 'idle' | 'generating' | 'completed' | 'failed';
  progress?: number;
  error?: string | null;
  errorMsg?: string;
}

interface GenVideoSettings {
  kind: 'gen-video';
  videoPrompt: string;
  model: string;
  /** "5s" / "10s" / "15s" / "25s" 或纯数字 */
  duration?: string | number;
  ratio?: string;
  resolution?: string;
  /** 来源帧（图生视频用） */
  referenceImages?: string[];
  /** 视频 sourceType + sourceId（用于追溯起源节点） */
  sourceType?: NodeType;
  sourceId?: string;
  customParams?: Array<{ name: string; value: unknown; override?: boolean }>;
  apiConfig?: ApiOverride;
  isGenerating?: boolean;
  progress?: number;
  error?: string | null;
  /** 配音结果（M5+） */
  voiceoverResults?: Array<{ shotId?: string; url: string; text?: string }>;
}

interface VideoInputSettings {
  kind: 'video-input';
  content?: string;
  videoFileName?: string;
  videoMeta?: { duration?: number; width?: number; height?: number };
  frames?: Array<{ time: number; url: string }>;
  selectedKeyframes?: Array<{ time: number; url: string }>;
}

interface PreviewSettings {
  kind: 'preview';
  /** 'image' | 'video' */
  previewType?: 'image' | 'video';
  content?: string;
}

interface TextNodeSettings {
  kind: 'text-node';
  text: string;
}

interface NovelInputSettings {
  kind: 'novel-input';
  content: string;
}

interface StoryboardSettings {
  kind: 'storyboard-node';
  shots: Array<{
    id: string;
    prompt?: string;
    duration?: number | string;
    aspectRatio?: string;
    imageUrl?: string;
    videoUrl?: string;
    status?: 'idle' | 'generating' | 'done' | 'failed';
    generationStartTime?: number;
    errorMsg?: string;
    voiceover?: string;
    voiceoverUrl?: string;
  }>;
  analysisResults?: unknown;
  llmPromptSlots?: Array<Record<string, unknown>>;
  llmPromptSlotSelection?: unknown;
}

interface ImageCompareSettings {
  kind: 'image-compare';
  imageA?: string;
  imageB?: string;
  /** 合成结果 */
  content?: string;
}

interface CreateCharacterSettings {
  kind: 'create-character';
  name?: string;
  age?: string | number;
  gender?: string;
  description?: string;
  prompt?: string;
  mode?: 'image' | 'video';
  style?: string;
  imageModel?: string;
  imageRatio?: string;
  imageResolution?: string;
  chatModel?: string;
  referenceImages?: string[];
  isCreating?: boolean;
  createProgress?: number;
  createError?: string | null;
}

interface CreateSceneSettings {
  kind: 'create-scene';
  name?: string;
  description?: string;
  prompt?: string;
  style?: string;
  imageModel?: string;
  imageRatio?: string;
  imageResolution?: string;
  chatModel?: string;
  referenceImages?: string[];
  isCreating?: boolean;
  createProgress?: number;
  createError?: string | null;
}

interface GenerateCharacterImageSettings {
  kind: 'generate-character-image';
  characterId?: string;
  characterName?: string;
  model: string;
  ratio?: string;
  resolution?: string;
  referenceImages?: string[];
  prompt?: string;
  chatModel?: string;
  sourceType?: NodeType;
  sourceId?: string;
  isGenerating?: boolean;
  progress?: number;
  error?: string | null;
}

interface GenerateCharacterVideoSettings {
  kind: 'generate-character-video';
  characterId?: string;
  characterName?: string;
  model: string;
  duration?: string;
  ratio?: string;
  resolution?: string;
  videoPrompt?: string;
  referenceImages?: string[];
  sourceType?: NodeType;
  sourceId?: string;
  isGenerating?: boolean;
  progress?: number;
  error?: string | null;
}

interface GenerateSceneImageSettings {
  kind: 'generate-scene-image';
  sceneId?: string;
  sceneName?: string;
  model: string;
  ratio?: string;
  resolution?: string;
  referenceImages?: string[];
  prompt?: string;
  chatModel?: string;
  sourceType?: NodeType;
  sourceId?: string;
  isGenerating?: boolean;
  progress?: number;
  error?: string | null;
}

interface GenerateSceneVideoSettings {
  kind: 'generate-scene-video';
  sceneId?: string;
  sceneName?: string;
  model: string;
  duration?: string;
  ratio?: string;
  resolution?: string;
  videoPrompt?: string;
  referenceImages?: string[];
  sourceType?: NodeType;
  sourceId?: string;
  isGenerating?: boolean;
  progress?: number;
  error?: string | null;
}

interface ExtractCharactersScenesSettings {
  kind: 'extract-characters-scenes';
  /** 上游来的小说全文 */
  sourceText?: string;
  model: string;
  isExtracting?: boolean;
  progress?: number;
  error?: string | null;
  /** 抽取结果 */
  characters?: Array<{ name: string; description: string }>;
  scenes?: Array<{ name: string; description: string }>;
}

interface VideoAnalyzeSettings {
  kind: 'video-analyze';
  model: string;
  isAnalyzing?: boolean;
  progress?: number;
  error?: string | null;
  analysisResult?: string;
  /** 起止秒数（截取分析片段） */
  startSecond?: number;
  endSecond?: number;
}

interface LocalSaveSettings {
  kind: 'local-save';
  localServerUrl?: string;
  subfolder?: string;
  category?: string;
  ext?: string;
}

interface ApiOverride {
  modelId?: string;
  model?: string;
  key?: string;
  url?: string;
  provider?: string;
}
```

## 3. 端口与连线规则（重写约定）

| 节点类型 | 输入端口接受 | 输出端口产出 |
|---|---|---|
| `input-image` | — | `image` |
| `gen-image` | `image`（多张作为参考） / `text`（作 prompt） / `mask` | `image` |
| `gen-video` | `image`（首/末帧 / 参考） / `text` | `video` |
| `video-input` | — | `video` + `image[]`（帧） |
| `preview` | `image` / `video` | — |
| `text-node` | — | `text` |
| `novel-input` | — | `text` |
| `storyboard-node` | `text`（小说） | `image[]` / `video[]` |
| `image-compare` | `image`×2 | `image` |
| `create-character` | `text`（描述） | `character`（自定义流） |
| `generate-character-image` | `character` | `image` |
| `extract-characters-scenes` | `text` | `character[]` + `scene[]` |
| `video-analyze` | `video` | `text` |
| `local-save` | `image` / `video` | — |

> xyflow 不强制端口类型，重写时在节点组件里自行 validate；落到 `useUpstream` 钩子里判断 `from.type` 是否在白名单。

## 4. 节点 ID 规则

- 形如 `node_${nanoid(10)}`
- 撤销栈不依赖 ID 不变；clone 节点必须生成新 ID
- 序列化跨设备：保留原 ID，但 IDB 快照里把节点引用的图片 dataURL 解出为外部资源（M5+ 实装）
