# README 使用说明

本目录包含 PinCanvas 的设计文档。

## 文件说明

- **README.md** - 公开版本（用于 GitHub 等公开仓库）
- **README.internal.md** - 内部版本（包含内部信息、部署说明等）

* **[architecture.md](./architecture.md)** - 系统架构设计

  * 数据模型（节点、连线、项目）

  * 状态管理（Zustand + Zundo）

  * 上游引用机制

  * 并发队列调度

* **[node-types.md](./node-types.md)** - 节点类型规范

  * 节点类型定义

  * TypeScript 判别联合

  * 节点 settings 结构

* **[api-contract.md](./api-contract.md)** - API 契约规范

  * OpenAI 兼容接口

  * 请求/响应格式

  * 错误处理

* **[model-routing.md](./model-routing.md)** - 模型路由设计

  * 模型定义（ModelDef）

  * 路由规则

  * 端点选择逻辑

* **[persistence.md](./persistence.md)** - 持久化设计

  * IndexedDB 存储策略

  * localStorage 偏好键

  * 自动保存机制

## 快速导航

### 我想了解...

* **项目整体架构** → 阅读 `architecture.md`

* **如何添加新节点** → 阅读 `node-types.md` + `architecture.md`

* **如何对接新的 AI 模型** → 阅读 `model-routing.md` + `api-contract.md`

* **数据如何存储** → 阅读 `persistence.md`

### 我想开发...

* **新的节点类型** → `node-types.md` + `src/canvas/nodes/`

* **新的 AI 模型支持** → `model-routing.md` + `src/api/`

* **新的存储方案** → `persistence.md` + `src/store/persistence.ts`

## 文档维护

* 架构变更需同步更新 `architecture.md`

* 新增节点类型需更新 `node-types.md`

* API 变更需更新 `api-contract.md`
