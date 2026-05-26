# CLAUDE.md — 轻量级 Web 可视化大屏平台（Vue 3 重构）

> 工作目录: `~/prj/mvp_vue`  
> 基线工程: `~/prj/mvp`（React 18，只读参考，功能验收标准）  
> 重构目标: **编辑 JSON，不是编辑页面** — Schema 与 API 契约与 React 版兼容。

---

## 技术栈

| 层 | 技术 | 版本 / 说明 |
|---|---|---|
| 前端框架 | **Vue 3** | ^3.5，Composition API + `<script setup>` |
| 构建工具 | **Vite** | ^5.4 |
| 语言 | **TypeScript** | ^5.5，`strict: true` |
| UI 样式 | **TailwindCSS** | ^3.4，编辑器暗色主题与 mvp 对齐 |
| 状态管理 | **Pinia** | ^2.2，单 store `useEditorStore` |
| 拖拽 | **vue-draggable-plus** | ^0.5，Sortable 封装；画布 resize 自研 |
| 组合式工具 | **@vueuse/core** | ^11，全屏、ResizeObserver 等 |
| 图表 | **Apache ECharts** | ^5.5，命令式 `setOption`（与 React 版一致） |
| 图标 | **@iconify/vue** + tabler | 与 mvp 相同图标集 |
| 字体 | **@fontsource/** | Share Tech Mono 等，无 CDN |
| 共享类型 | **@mvp-vue/schema** | 从 `../mvp/packages/schema` 同步 |
| 后端（初期） | **共用 `../mvp` server** | Fastify 4 + Prisma 5 + SQLite :3002 |
| 包管理 | **pnpm workspace** | `packages/*` |

**详细选型理由、备选对比、禁止方案** → [`doc/tech-stack.md`](doc/tech-stack.md)

---

## 文档位置

| 文档 | 路径 |
|------|------|
| 技术选型 | `doc/tech-stack.md` |
| 开发计划 & 进度 | `doc/dev-plan.md` |
| 功能对等清单 | `doc/parity-checklist.md` |
| 需求原文（React 版） | `../mvp/doc/需求.md` |
| Mock 联调说明 | `../mvp/README.md`（地图、卡片列表章节） |

---

## 项目结构

```
mvp_vue/
├── doc/
│   ├── tech-stack.md
│   ├── dev-plan.md
│   └── parity-checklist.md
└── packages/
    ├── schema/                 # @mvp-vue/schema — PageSchema, ComponentType, 工具函数
    │   └── src/index.ts
    ├── editor/                 # @mvp-vue/editor — :5000
    │   └── src/
    │       ├── App.vue              # 布局 + DnD 上下文 + 工具栏 + 快捷键
    │       ├── stores/editorStore.ts # Pinia；默认值来自 editorRegistry
    │       ├── api.ts
    │       ├── composables/         # useCanvasScale, useKeyboardShortcuts 等
    │       └── components/
    │           ├── PropertyPanel.vue
    │           ├── propertyPanel/   # PagePropertyPanel, CompPropertyPanel, shared
    │           ├── registry/        # editorRegistry（按类型分目录）
    │           ├── canvas/ComponentPreview.vue
    │           ├── ComponentPanel.vue
    │           ├── Canvas.vue
    │           ├── ResizeHandles.vue
    │           └── OpenDialog.vue
    ├── renderer/               # @mvp-vue/renderer — :5001
    │   └── src/
    │       ├── App.vue              # 加载 Schema + scale / fullscreen
    │       ├── api.ts
    │       ├── composables/useData.ts
    │       └── components/
    │           ├── componentMap.ts
    │           ├── *Renderer.vue
    │           └── geo/             # 地图注册
    └── server/                 # 可选；Phase 0–3 使用 ../mvp/packages/server
```

---

## 启动命令

```bash
# 本仓库（前端，scaffold 完成后）
cd ~/prj/mvp_vue
pnpm install
pnpm dev:editor      # → http://localhost:5000
pnpm dev:renderer    # → http://localhost:5001

# 后端 — 在 mvp 仓库启动（单实例）
cd ~/prj/mvp
pnpm install          # 若未安装
pnpm -F @mvp/server exec prisma db push   # 首次
pnpm dev:server       # → http://localhost:3002
```

环境变量（editor/renderer）：

- `VITE_API_BASE` — 默认 `http://localhost:3002`

---

## 开发服务约定（Agent / AI 必读）

与 React 版 **相同**：

- **后端 `pnpm dev:server` 由开发者在本机手动启动**（在 `~/prj/mvp`）。Agent **不要** 在 mvp_vue 或 mvp 中执行长驻 `dev:server` / `tsx --watch`（含后台 Shell）。
- **禁止重复启动**：端口 3002 单实例；需要 API 时假定已在 `localhost:3002`。
- Agent 验证接口：仅 **一次性** `curl` / `fetch`；失败则提示用户检查 server。
- **编辑器 / 渲染器 dev 进程**同样不要由 Agent 随意启动；给出命令由用户执行。
- 数据库种子、迁移等短时命令可执行（在 mvp 目录，如 `pnpm -F @mvp/server db:seed`）。

---

## 核心设计（与 mvp 一致）

- **核心理念**：Editor 产出 JSON Schema，Renderer 消费 Schema 渲染。
- **布局**：绝对定位 `position: absolute`，持久化 `x/y/w/h`；默认设计稿 1920×1080（可配置 `pageWidth` / `pageHeight`）。
- **Schema 稳定性最高**：禁止随意改字段名或语义；变更需同步 schema 包并做双向回归（见 `parity-checklist.md` G3）。
- **组件注册**：
  - Renderer：`componentMap`（type → Vue SFC）
  - Editor：`editorRegistry`（type → defaults + PropertyFields + CanvasPreview）
- **画布缩放**：`canvasScaleRef`（或 `provide('canvasScale')`）；拖拽位移 **÷ scale** 补偿。
- **Editor 预览 ≠ Renderer 真渲染**：仅共享 Schema，不共享组件文件。

---

## Vue 迁移要点（Agent 编码时）

| React 模式 | Vue 对应 |
|------------|----------|
| `useState` / `useRef` | `ref` / `shallowRef` |
| `useEffect` | `onMounted` / `watch` / `watchEffect` |
| `useCallback` / `useMemo` | 普通函数 / `computed` |
| `createContext` + `useContext` | `provide` / `inject` 或 Pinia |
| Zustand `useEditorStore` | Pinia `useEditorStore` + `storeToRefs` |
| `DndContext` / `useDraggable` | `vue-draggable-plus` + 自定义 pointer（框选、resize） |
| `React.CSSProperties` | `CSSProperties` from `vue` 或 inline style 对象 |
| `.tsx` 组件 | `.vue` SFC 或 `defineComponent` |

ECharts：优先 `shallowRef<echarts.ECharts>()` + `onBeforeUnmount(dispose)`。

---

## 实施顺序（禁止跳阶段）

1. **Phase 0**：schema 同步 + Vite 空壳  
2. **Phase 1**：renderer 全组件 + 数据绑定  
3. **Phase 2**：editor 画布交互  
4. **Phase 3**：editorRegistry + 属性面板  
5. **Phase 4**：联调与文档  

详见 [`doc/dev-plan.md`](doc/dev-plan.md)。

---

## 新增组件速查

1. `@mvp-vue/schema` — `ComponentType` + 类型  
2. `editor/.../registry/<type>/` — defaults, PropertyFields, CanvasPreview  
3. `registry/registry.ts` — 登记  
4. `renderer/.../componentMap.ts` — 登记  
5. `ComponentPanel.vue` — 左侧列表  

---

## 参考工程

| 工程 | 用途 |
|------|------|
| `~/prj/mvp` | 行为与文件级 port 源 |
| `~/nova-admin` | Vue3 + Vite + pnpm 习惯（勿默认引入 Naive UI 到本项目的 Phase 1–3） |
