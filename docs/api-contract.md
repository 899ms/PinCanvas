# API 契约

下游所有 AI 调用走 **OpenAI 兼容协议**，由 `apiConfig` 或全局配置决定 `baseUrl` 与 `apiKey`。
模型分支详见 `docs/model-routing.md`，本文档只规定**请求 / 响应形状**。

## 0. 通用约定

- 所有请求带头：`Authorization: Bearer ${apiKey}`，`Content-Type` 视 endpoint 决定。
- baseUrl 不带末尾斜杠（如 `https://api.example.com`），endpoint 以 `/v1/...` 拼接。
- 错误响应统一处理：`{ error: { message, type, code } }`。
- 重试策略：网络错误最多 2 次（指数退避）；4xx 不重试；5xx 重试 1 次。

## 1. `POST /v1/images/generations` —— 文生图

**Content-Type**: `application/json`

```jsonc
{
  "model": "flux-pro",
  "prompt": "a cat",
  "n": 1,                    // 一次返回几张，1-10
  "size": "1024x1024",       // 或 "1792x1024" / "1024x1792"
  "response_format": "url",  // 或 "b64_json"
  "quality": "hd"            // 可选，dall-e-3 / gpt-image-1 才识别
}
```

**响应**:

```jsonc
{
  "created": 1731234567,
  "data": [
    { "url": "https://...png" }
    // 或 { "b64_json": "..." }
  ]
}
```

## 2. `POST /v1/images/edits` —— 图生图 / 编辑

**Content-Type**: `multipart/form-data`

| 字段 | 必填 | 说明 |
|---|---|---|
| `model` | ✅ | 如 `nano-banana`、`qwen-image-edit` |
| `prompt` | ✅ | 编辑指令 |
| `image` | ✅ | 主参考图（File / Blob）。可重复 append，多张时表示多参考 |
| `mask` | ❌ | 蒙版（PNG，alpha 通道表示需编辑区域） |
| `n` | ❌ | 数量，默认 1 |
| `size` | ❌ | 同上 |
| `aspect_ratio` | ❌ | "16:9" 等，部分 provider 用这个替代 size |
| `image_size` | ❌ | 部分 provider 的别名 |
| `response_format` | ❌ | `url` / `b64_json` |

**响应**：同 generations。

### 2.1 异步变体 `POST /v1/images/edits?async=true`

适用于 `nano-banana-2` 等耗时模型。

- 立即返回：`{ task_id: "tk_xxx", status: "pending" }`
- 轮询：`GET /v1/images/edits/{task_id}` 或 `/v1/tasks/{task_id}`（视 provider）
- 终态：`status: "completed"` 携带 `data: [{ url }]`，或 `status: "failed"` 携带 `error`

> 重写时实现 `pollTask(taskId, { interval: 2000, backoff: 1.4, maxInterval: 10000, maxDuration: 300000 })`。

## 3. `POST /v1/videos/generations` —— 文生视频 / 图生视频

**Content-Type**: `application/json`

```jsonc
{
  "model": "sora-2-pro",
  "prompt": "a cat walking on the beach",
  "duration": 10,           // 秒，整数或字符串
  "ratio": "16:9",
  "resolution": "1080p",
  // 图生视频：把首帧 base64 放这里（OpenAI Sora 私有字段，部分兼容网关支持）
  "image": "data:image/png;base64,...",
  // 或：首末帧分别传
  "first_frame": "data:image/png;base64,...",
  "last_frame": "data:image/png;base64,..."
}
```

**响应**：通常是异步任务返回 `{ id, status }`，需轮询。

## 4. `POST /v1/chat/completions` —— LLM 调用

用于 prompt 增强、小说抽角色、storyboard 拆分、视频分析等。

```jsonc
{
  "model": "gpt-4o",
  "messages": [
    { "role": "system", "content": "..." },
    { "role": "user", "content": "..." }
  ],
  "stream": false
}
```

视觉理解时 `content` 用数组：

```jsonc
{
  "role": "user",
  "content": [
    { "type": "text", "text": "describe" },
    { "type": "image_url", "image_url": { "url": "data:..." } }
  ]
}
```

## 5. Midjourney 自有协议

不同代理网关协议不一，重写时通过 `provider === 'midjourney'` 抽到 `api/midjourney.ts`。
共同特征：
- 返回 4 张拼接图 → 客户端切成 4 张 → 写入 `node.mjImages[]`
- 二次操作（U1/U2/V1/V2）需要 messageId + customId

## 6. 本地辅助服务（可选）

如果用户启了类 ComfyUI / WebUI 的本地缓存服务：

| Endpoint | 用途 |
|---|---|
| `GET  {local}/ping` | 探活，决定是否启用本地缓存 |
| `POST {local}/save-cache` | 单文件入库 |
| `POST {local}/save-batch` | 批量保存 |
| `GET  {local}/pick-path` | 让用户在本地选目录 |
| `GET  {local}/list-files` | 列文件 |
| `POST {local}/config` | 更新配置 |

请求体示意：

```jsonc
// save-cache
{
  "id": "node_xxx",
  "content": "https://... or data:image/png;base64,...",
  "category": "image",
  "ext": "png",
  "type": "image"
}

// save-batch
{
  "files": [{ "url": "...", "name": "..." }],
  "subfolder": "project-a/v1"
}
```

## 7. 参数模板引擎

请求体里允许出现 `{{var:format}}` 占位符，在派发前替换。

| 模板 | 来源 | 转换 |
|---|---|---|
| `{{prompt}}` | 节点 settings.prompt | 字符串 |
| `{{duration:number}}` | settings.duration | parseInt |
| `{{ratio}}` / `{{resolution}}` | settings | 字符串 |
| `{{image:blob}}` | 主参考图 | fetch → blob，append 到 FormData |
| `{{firstFrame:blob}}` / `{{lastFrame:blob}}` | settings.referenceImages[0/1] | 同上 |
| `{{n:number}}` | settings.n | parseInt |
| `{{messages}}` | LLM 消息数组 | JSON.stringify |
| `{{requestId}}` | 上一步异步任务返回 | 字符串 |
| `{{modelName}}` | 模型库解析后 | 字符串 |
| `{{jimengDuration:number}}` | settings.duration | provider 特定换算 |
| `{{jimengRatio}}` / `{{jimengResolution}}` | settings | provider 特定映射表 |
| `{{provider.key}}` / `{{provider.baseUrl}}` | apiConfig 或全局 | 字符串 |
| `{{type}}` | node.type | 字符串 |

**正则**：`/\{\{\s*([a-zA-Z0-9_.]+)(?::([a-zA-Z0-9_-]+))?\s*\}\}/g`

**实现要点**：
- `:blob` 是唯一会触发 FormData 而非 JSON 的修饰符；解析时如果发现任意 `:blob`，整个请求改用 multipart。
- 替换失败（变量缺失）抛 `TemplateMissingError`，UI 标红节点。

## 8. 重写实现路径

```
src/api/
├── client.ts           # fetch 封装：超时、重试、AbortController、错误归一
├── template.ts         # 模板解析 + JSON / FormData 路由
├── images.ts           # generations + edits（同步 + 异步）
├── videos.ts           # videos/generations + 轮询
├── chat.ts             # chat/completions
├── midjourney.ts       # MJ 私有协议
├── local.ts            # 本地服务
├── model-routing.ts    # 选 endpoint
└── poll.ts             # 通用轮询器
```
