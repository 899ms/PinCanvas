# 贡献指南

感谢你对 PinCanvas 的兴趣！本文档说明如何参与项目开发。

## 🐛 报告问题

- 在 [Issues](https://github.com/tdsoc2002/PinCanvas/issues) 中搜索是否已有同类问题
- 提交新 issue 时请包含：
  - 复现步骤（最小可复现示例最佳）
  - 期望行为 vs 实际行为
  - 环境信息（浏览器、操作系统、Bun/Node 版本）
  - 相关截图或控制台日志

## 💡 提出新功能

- 在 [Discussions](https://github.com/tdsoc2002/PinCanvas/discussions) 中发起讨论
- 说明使用场景与解决的问题，而不只是"想要什么功能"
- 重大改动建议先开 issue 对齐方向，再写 PR

## 🔧 提交代码

### 开发环境

```bash
git clone https://github.com/tdsoc2002/PinCanvas.git
cd PinCanvas
bun install
bun run dev
```

### 分支约定

- `main`: 稳定主分支，受保护
- 功能分支: `feat/xxx`
- 修复分支: `fix/xxx`
- 文档分支: `docs/xxx`

### 提交流程

1. Fork 仓库并创建功能分支
2. 进行代码改动，确保：
   - 通过类型检查：`bun run typecheck`
   - 通过测试：`bun run test:run`
   - 通过 lint：`bun run lint`
   - 代码已格式化：`bun run format`
3. 提交时使用清晰的 commit message（建议 Conventional Commits）
4. 推送到你的 fork 并发起 Pull Request
5. 在 PR 描述中说明：
   - 改动的动机与目标
   - 测试方式
   - 截图或录屏（UI 改动）

### Conventional Commits 示例

```
feat(canvas): 添加节点搜索功能
fix(api): 修复 Midjourney 轮询重试逻辑
docs(readme): 更新部署说明
refactor(store): 简化撤销栈实现
test(api): 添加 Seedance 模型测试
chore(deps): 升级依赖
```

## 📐 代码规范

### 命名

- **localStorage 键**: 使用 `pin_` 前缀（统一通过 `getPref/setPref`）
- **IndexedDB 库**: 使用 `pincanvas-` 前缀
- **React 组件**: PascalCase
- **Hook**: `useXxx` 命名
- **工具函数**: camelCase

### TypeScript

- 优先使用类型推导，必要时显式标注
- 避免 `any`，宁可用 `unknown` 后再做类型守卫
- 节点 settings 用判别联合（discriminated union）

### React

- 优先函数组件 + Hooks
- 副作用清理记得返回 cleanup function
- 大列表使用 `memo` / `useMemo` 避免重渲染

### 样式

- Tailwind 优先，避免独立 CSS 文件
- 颜色使用 `zinc-*` 中性色，主色 `blue-600`

## 🧪 测试

- 新增功能需补充对应测试
- API 层使用 MSW 模拟外部接口
- 测试文件放在 `__tests__/` 目录下
- 测试命名：`xxx.test.ts` 或 `xxx.e2e.test.ts`

```bash
bun run test         # 监听模式
bun run test:run     # 单次运行
```

## 📚 文档

- 架构变更需更新 `docs/architecture.md`
- 新增节点类型需更新 `docs/node-types.md`
- API 变更需更新 `docs/api-contract.md`

## 🔍 代码审查

- 至少需要一位维护者 approve 才能合并
- CI 必须通过（typecheck、lint、test）
- 审查重点：
  - 是否引入安全风险（XSS、凭证泄露等）
  - 是否破坏向后兼容
  - 是否有充分测试覆盖
  - 代码可读性与命名

## 📜 许可证

提交代码即表示同意以 [MIT License](./LICENSE) 授权。
