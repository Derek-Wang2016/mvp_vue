# 开发计划 — mvp_vue（Vue 3 重构）

> 最后更新: 2026-05-22  
> 参考工程: [`../mvp`](../mvp)  
> 技术选型: [tech-stack.md](./tech-stack.md)  
> 验收清单: [parity-checklist.md](./parity-checklist.md)  
> 需求原文: [`../mvp/doc/需求.md`](../mvp/doc/需求.md)

---

## 项目目标

将 React 版可视化大屏平台 **完整迁移** 至 Vue 3，保持：

- JSON Schema 契约不变（`@mvp-vue/schema`）
- REST API 与端口不变（后端初期共用 `../mvp` server）
- 用户操作习惯与视觉风格基本一致

**非目标（首期）**：iframe/视频组件、Docker 部署、后端密钥托管、新功能扩展。

---

## 仓库结构（目标态）

```
mvp_vue/
├── CLAUDE.md
├── README.md
├── package.json
├── pnpm-workspace.yaml
├── doc/
│   ├── dev-plan.md          ← 本文件
│   ├── tech-stack.md
│   └── parity-checklist.md
└── packages/
    ├── schema/              # @mvp-vue/schema — 从 mvp 同步
    ├── editor/              # @mvp-vue/editor   — :5000
    ├── renderer/            # @mvp-vue/renderer — :5001
    └── server/              # @mvp-vue/server   — Phase 4 可选；前期用 ../mvp
```

---

## 里程碑总览

| 阶段 | 名称 | 预估 | 交付物 |
|------|------|------|--------|
| **Phase 0** | 工程脚手架 | 2–3 天 | ✅ workspace、schema 同步、空壳 editor/renderer 可启动 |
| **Phase 1** | Editor 核心交互 | 3–4 周 | ✅ 拖拽/resize/多选/撤销/保存/加载 |
| **Phase 2** | Editor 注册表与属性 | 2–3 周 | editorRegistry 全类型 CanvasPreview + PropertyFields |
| **Phase 3** | Renderer 对等 | 2–3 周 | 全部运行时组件 + 数据绑定 + 全屏模式 |
| **Phase 4** | 联调与发布准备 | 1 周 | 对等清单 G1–G3、文档、可选 server 迁入 |
| **Phase 5** | 质量与后续 | 持续 | 单测、E2E、iframe/视频、Docker |

**合计（单人全职）**：约 **8–11 周** 达到与 React 版功能对等。

---

## Phase 0 — 工程脚手架

> 状态: **进行中（文档已完成，代码待 scaffold）**

### 任务

- [x] 创建 `mvp_vue` 工作目录与 `doc/` 文档
- [x] 编写 `tech-stack.md`、`parity-checklist.md`、`CLAUDE.md`
- [ ] 初始化 git 仓库（可选，由负责人执行）
- [ ] `packages/schema`：复制 `../mvp/packages/schema/src/**`
- [ ] `packages/schema/package.json` → `"name": "@mvp-vue/schema"`
- [ ] `packages/renderer`：Vite + Vue + TS + Tailwind 最小 `App.vue`（Hello）
- [ ] `packages/editor`：同上，端口 5000
- [ ] 根目录 `pnpm install` 通过
- [ ] 文档：在 README 注明 server 启动方式（见下）

### Server 共用方式（Phase 0–3）

```bash
# 在 mvp 目录启动后端（单实例，勿重复启动）
cd ../mvp && pnpm dev:server
```

Vue 前端 `VITE_API_BASE=http://localhost:3002`（默认值）。

### 完成标准

- `pnpm dev:renderer` 可打开空白页
- `pnpm dev:editor` 可打开空白页
- `@mvp-vue/schema` 可被 editor/renderer `import type { PageSchema } from '@mvp-vue/schema'`

---

## Phase 1 — Renderer（优先）

> 原则：**只读、易对比**；用 React 版保存的 `schemaJson` 做 golden 测试。

### 1.1 骨架

- [ ] `api.ts`：`getPage(id)` → `GET /api/pages/:id`
- [ ] `App.vue`：加载态 / 错误态 / 画布容器
- [ ] 画布：`width`/`height` + `transform: scale()` 适应窗口
- [ ] URL：`?id=`、`?fullscreen=1` 解析与同步
- [ ] 全屏按钮 + Fullscreen API + Esc 监听（`@vueuse/core`）

### 1.2 componentMap（按类型逐个 port）

| 顺序 | 组件 | 源文件参考 (mvp) |
|------|------|------------------|
| 1 | text | `TextRenderer.tsx` |
| 2 | image | `ImageRenderer.tsx` |
| 3 | datetime | `DatetimeRenderer.tsx` |
| 4 | analog-clock | `AnalogClockRenderer.tsx` |
| 5 | table | `TableRenderer.tsx` |
| 6 | bar/line/pie | `ChartRenderer.tsx` |
| 7 | page-nav-button | `PageNavButtonRenderer.tsx` |
| 8 | card-list | `CardListRenderer.tsx` |
| 9 | map | `MapRenderer.tsx` + geo 工具 |

- [ ] `componentMap.ts`：`Record<ComponentType, Component>`（`defineAsyncComponent` 可选）
- [ ] 底图 `bgImage` / `bgOpacity` / 渐变背景
- [ ] `iconSetup.ts`、`@fontsource` 字体引入

### 1.3 数据层

- [ ] `DataContext` → `provide/inject` 或 composable `useData.ts`
- [ ] 轮询、`POST /api/data-proxy`、`POST /api/query`
- [ ] ECharts：`shallowRef` + `setOption` 更新策略
- [ ] 图表字段自动映射（port `CATEGORY_KEYS` / `VALUE_KEYS`）

### 1.4 验收

- [ ] `parity-checklist.md` 章节 D、F 全部勾选
- [ ] 使用 mvp 数据库 id=6/7/8 页面视觉与数据一致

---

## Phase 2 — Editor 核心交互

### 2.1 布局与 Store

- [ ] `stores/editorStore.ts`（Pinia，port `editorStore.ts`）
- [ ] `App.vue`：工具栏 + 三栏布局（无拖拽先静态）
- [ ] `ComponentPanel.vue`：组件列表 UI
- [ ] `PropertyPanel.vue` → 路由到 Page / Comp 子面板（空壳）

### 2.2 画布

- [ ] `Canvas.vue`：`canvasScale` + `ResizeObserver`
- [ ] `vue-draggable-plus`：面板 clone → 画布 drop
- [ ] 画布项拖动 + scale 补偿
- [ ] `ResizeHandles.vue`：8 方向
- [ ] 框选、Shift 多选、点击空白取消
- [ ] 多选 `groupDragOffset` 整体拖
- [ ] 网格线 toggle

### 2.3 命令与持久化

- [ ] 撤销/重做栈
- [ ] 剪贴板 copy/cut/paste
- [ ] 层级调整、Delete、右键菜单
- [ ] `api.ts`：save / update / list / get
- [ ] `OpenDialog.vue`、Ctrl+S、URL `?id=` 加载
- [ ] 工具栏图标（Tabler SVG）

### 2.4 验收

- [ ] `parity-checklist.md` 章节 B 全部勾选
- [ ] 可新建页面、拖入 text、保存后在 Vue renderer 查看

---

## Phase 3 — Editor 注册表与属性

### 3.1 editorRegistry

目录对称 React 版：

```
editor/src/components/registry/
├── registry.ts
├── types.ts
├── text/
├── image/
├── chart/
├── table/
├── datetime/
├── analog-clock/
├── page-nav-button/
├── card-list/
├── key-value-tag/
└── map/
```

每个类型：

- `defaults.ts`
- `XxxPropertyFields.vue`
- `XxxCanvasPreview.vue`
- 可选 `XxxDataFields.vue`

- [ ] `ComponentPreview.vue` 按 type 分发
- [ ] `CompPropertyPanel.vue`：Tab 属性 | 数据
- [ ] `PagePropertyPanel.vue`：尺寸、底图、数据源、字典

### 3.2 复杂类型

- [ ] card-list：空态、字段布局、API 导入字段
- [x] card：单对象/数组过滤、双数据源、复用 card-list 字段渲染
- [ ] map：省级选择、视觉样式、mock 联调说明
- [ ] chart：分类/数值字段显式指定

### 3.3 对话框与工具

- [ ] ViewJson / JsonExport / Confirm / IconPicker
- [ ] DictJsonImport、ComponentPropsJson
- [ ] `parseImportedPageConfig`、`importPageSchema` 等工具函数 port

### 3.4 验收

- [ ] `parity-checklist.md` 章节 C、E 全部勾选
- [ ] 章节 G：双向 Schema 兼容

---

## Phase 4 — 联调与发布准备

- [ ] README：启动顺序、Mock URL、地图/卡片配置（从 mvp README port）
- [ ] 编辑器「复制预览链接」按钮（可选）
- [ ] 决定是否将 `server` 迁入本仓库（复制 prisma + src）
- [ ] `CLAUDE.md` / `dev-plan.md` 进度更新为「首期完成」

---

## Phase 5 — 后续（非阻塞）

- [ ] iframe / video 组件（schema 已有 type 时实现）
- [ ] Vitest：schema 工具函数、坐标换算
- [ ] Playwright：拖入组件 smoke
- [ ] Docker Compose（editor + renderer + server + volume）
- [ ] 后端密钥托管

---

## 编辑器组件注册表（Vue 版）

与 React 版相同心智模型，**仅框架语法不同**：

| 包 | 注册表 | 职责 |
|---|---|---|
| **editor** | `editorRegistry` | `defaultProps` / `defaultSize` / `PropertyFields` / `CanvasPreview` / `DataFields?` |
| **renderer** | `componentMap` | type → 运行时 SFC |

### `EditorComponentDef` 契约（TypeScript）

```ts
interface EditorComponentDef {
  defaultProps: () => Record<string, unknown>
  defaultSize: () => { w: number; h: number }
  PropertyFields: Component // Vue SFC
  CanvasPreview: Component
  DataFields?: Component
}
```

统一 props：`ComponentPropertyFieldsProps`（`comp` + `updateProps(patch)`）。

### 新增组件 Checklist

1. `@mvp-vue/schema`：扩展 `ComponentType` 与类型常量
2. `registry/<type>/`：defaults + PropertyFields + CanvasPreview
3. `registry/registry.ts` 登记
4. `renderer/componentMap.ts` 登记
5. `ComponentPanel.vue` 增加拖拽项

**注意**：Editor 预览与 Renderer **不共用** SFC 文件；JSON Schema 是唯一契约。

---

## 本地 Mock 接口（联调）

> 实现位于 **`../mvp/packages/server`**，Vue 版直接调用，无需重写。

| 接口 | 用途 |
|------|------|
| `GET /api/demo/card-list` | card-list 组件 |
| `GET /api/demo/map-stats` | map 组件 |
| `GET /api/demo/live-data` | 兼容旧地图数据 |

详细参数见 [`../mvp/README.md`](../mvp/README.md) 与 [`../mvp/doc/dev-plan.md`](../mvp/doc/dev-plan.md)。

---

## 进度跟踪（摘要）

> **2026-05-22 调整**：Phase 顺序改为 Editor 优先（原 Renderer 优先），参见 [editor-first plan](../.claude/plans/editor-render-parsed-scone.md)。

| Phase | 名称 | 状态 |
|-------|------|------|
| Phase 0 脚手架 | 工程脚手架 | ✅ 完成 (2026-05-22) |
| Phase 1 Editor 交互 | Editor 核心交互 | ✅ 完成 (2026-05-22) |
| Phase 2 Editor 注册表 | Editor 注册表与属性面板 | ✅ 完成 (2026-05-23) |
| Phase 3 Renderer | Renderer 对等 | ✅ 完成 (2026-05-26) |
| Phase 4 联调 | 联调与发布 | 未开始 |
| Phase 5 后续 | 质量与后续 | 未开始 |

---

## 风险与对策

| 风险 | 对策 |
|------|------|
| 拖拽坐标偏差 | 保留 `canvasScale` 算法单测；对照 React 录屏 |
| Schema 漂移 | schema 仅从 mvp 同步；变更走 PR 双仓评审 |
| 工期膨胀 | 严格 Phase 顺序，Renderer 未通过不开 Editor 大功能 |
| Server 端口冲突 | 遵守 CLAUDE.md：禁止 Agent 重复启动 server |

---

## 相关命令（目标态）

```bash
# 安装
pnpm install

# 后端（在 mvp 目录，单实例）
cd ../mvp && pnpm dev:server

# 前端
cd ~/prj/mvp_vue
pnpm dev:renderer   # :5001
pnpm dev:editor     # :5000
```
