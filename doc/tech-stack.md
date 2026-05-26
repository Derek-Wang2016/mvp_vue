# 技术选型说明

> 最后更新: 2026-05-22  
> 参考工程: [`../mvp`](../mvp)（React 18 + Zustand + dnd-kit）  
> 本文档为 **mvp_vue** 重构的权威选型依据；实现阶段不得随意替换核心依赖，变更须更新本文档并注明原因。

---

## 一、选型原则

1. **Schema 优先**：`@mvp-vue/schema` 与 React 版字段、语义一致；前端框架可换，JSON 契约不换。
2. **最小惊讶**：编辑器交互、端口、API 路径、URL 参数与 React 版对齐，降低迁移与联调成本。
3. **可逐包交付**：先 Renderer（只读、易验收），后 Editor（交互重）；Server 尽量复用。
4. **避免过度工程**：不引入微前端、不混跑 React+Vue；属性面板 Phase 1 不强制 UI 组件库。

---

## 二、总览对照表

| 层级 | React 版 (`mvp`) | Vue 版 (`mvp_vue`) | 变更说明 |
|------|------------------|-------------------|----------|
| 前端框架 | React 18.3 | **Vue 3.5+** | 全量重写 editor / renderer |
| 构建 | Vite 5.4 | **Vite 5.4** | 保持大版本一致 |
| 语言 | TypeScript 5.5 | **TypeScript 5.5** | `strict` 开启 |
| 样式 | TailwindCSS 3.4 | **TailwindCSS 3.4** | 类名与暗色编辑器样式可复用 |
| 状态 | Zustand 4 | **Pinia 2** | editorStore 一一映射 |
| 拖拽 | @dnd-kit/core 6 | **vue-draggable-plus 0.5+** | 见 §五 |
| 图表 | ECharts 5.5 | **ECharts 5.5** | 命令式封装，见 §六 |
| 图标 | @iconify/react | **@iconify/vue** | 同一 tabler 图标集 |
| 字体 | @fontsource/* | **@fontsource/*** | 与 React 版相同自托管字体 |
| 工具库 | — | **@vueuse/core 11+** | 窗口、防抖、全屏等 |
| 共享类型 | @mvp/schema | **@mvp-vue/schema** | Phase 0 从 mvp 同步 |
| 后端 | Fastify 4 + Prisma 5 | **复用 `../mvp/packages/server`** | Phase 0–3 不重写 |
| 数据库 | SQLite | **SQLite** | 共用同一 `pages` 表与 demo 接口 |
| 包管理 | pnpm workspace | **pnpm workspace** |  monorepo 结构对称 |

---

## 三、前端核心

### 3.1 Vue 3

| 项 | 选型 |
|----|------|
| 版本 | `^3.5.0`（或当前稳定 3.5.x） |
| API 风格 | **Composition API + `<script setup lang="ts">`** |
| 单文件组件 | `.vue`；复杂逻辑抽到 `composables/` 或 `*.ts` |
| 路由 | 首版 **不需要 vue-router**（单页 App，URL 用 `?id=` 查询参数，与 React 版一致） |
| 渲染器入口 | `createApp(App).mount('#app')` |

**不采用 Options API 为主力写法**，便于与 React hooks 思维对照迁移。

### 3.2 TypeScript

| 项 | 选型 |
|----|------|
| 版本 | `^5.5.0` |
| 配置 | 各包 `tsconfig.json` + 根 `tsconfig.base.json`（待 scaffold 时添加） |
| Vue 类型 | `vue-tsc` 用于 build 前类型检查 |
| 严格模式 | `"strict": true`，`noUncheckedIndexedAccess` 建议开启 |

### 3.3 Vite

| 项 | 选型 |
|----|------|
| 版本 | `^5.4.0` |
| Vue 插件 | `@vitejs/plugin-vue` `^5.x` |
| JSX | **不默认启用**；注册表表单用 SFC；若某预览需 JSX 再按需 `@vitejs/plugin-vue-jsx` |
| 环境变量 | `import.meta.env`；API 基址 `VITE_API_BASE` 默认 `http://localhost:3002` |
| 开发端口 | editor `5000`，renderer `5001`（`vite.config.ts` 内 `server.port` 写死） |

---

## 四、状态管理 — Pinia

| 项 | 选型 |
|----|------|
| 库 | `pinia` `^2.2` |
| 持久化 | **Phase 1 不使用** `pinia-plugin-persistedstate`（画布状态仅内存；页面数据走 server） |
| Store 划分 | 单 store：`useEditorStore`（对应 `editorStore.ts`） |
| 与 Zustand 映射 | `components / selectedIds / past-future / clipboard / groupDragOffset` 等同名字段 |

**实现约定**：

- 撤销/重做：`past` / `future` 快照栈，`MAX_HISTORY = 50`（与 React 版相同）。
- 默认值：`addComponent` 调用 `getDefaultProps` / `getDefaultSize`（来自 `editorRegistry`）。
- 组件外使用 store：组合式 `const store = useEditorStore()`；模板内可直接解构（注意应用 `storeToRefs` 保持响应性）。

---

## 五、拖拽与画布交互

### 5.1 选型结论：`vue-draggable-plus`

| 候选 | 结论 |
|------|------|
| **vue-draggable-plus** | ✅ **采用**。基于 Sortable.js，Vue 3 维护活跃，支持 clone、group、自定义 handle。 |
| vue-draggable-next | ❌ 维护节奏与 Vue 3.5 生态略弱于 plus。 |
| 纯 @vueuse + pointer 自研 | ❌ 工作量大，仅作 plus 无法满足时的备选。 |
| HTML5 原生 DnD | ❌ 体验与 dnd-kit 差距大，不推荐。 |

### 5.2 与 dnd-kit 的行为对齐要求

| 能力 | React (dnd-kit) | Vue 实现要点 |
|------|-----------------|--------------|
| 面板 → 画布拖入 | `DndContext` + `DragOverlay` | 左侧列表 `group: { name: 'components', pull: 'clone', put: false }`；画布 `put: true`；`onAdd` 计算坐标 |
| 画布上移动 | `useDraggable` | 画布项 `draggable` + `data-comp-id`；**禁用**拖入时的 sort 乱序（`sort: false` 或独立列表） |
| 缩放补偿 | `canvasScaleRef` | `provide('canvasScale', scaleRef)` 或模块级 `canvasScaleRef`；位移 ÷ scale |
| 多选整体拖 | 自定义 `groupDragOffset` | 保持 store 字段；拖拽时写 offset，结束提交 `moveComponents` |
| 框选 | 原生 mouse 事件 | 保留 React 版矩形相交算法，不用 draggable 库 |
| Resize | 8 手柄 | 纯 Vue 组件 + pointer 事件，**不经过** Sortable |

### 5.3 画布缩放

- 使用 `ref(0.5)` 的 `canvasScale`，`ResizeObserver` 监听容器（逻辑 port 自 `Canvas.tsx`）。
- `transform: scale()` 应用在画布外层；坐标换算公式与 React 版文档一致。

---

## 六、图表 — ECharts

| 项 | 选型 |
|----|------|
| 版本 | `echarts` `^5.5.0` |
| Vue 封装 | **Phase 2 采用命令式**（`shallowRef` + `onMounted` + `setOption`），与 React `ChartRenderer` 一致 |
| 可选后续 | `vue-echarts` 仅在确认生命周期无泄漏后再评估 |
| 地图 | `echarts` map + 自托管 `china.json`；geo 注册逻辑 port 自 renderer |

**原则**：数据刷新时 **不销毁** 实例，仅 `setOption`；轮询时不闪 loading（与 React 版一致）。

---

## 七、样式与图标

### 7.1 TailwindCSS

| 项 | 选型 |
|----|------|
| 版本 | `^3.4.0` |
| 配置 | 各包独立 `tailwind.config.js` + `postcss.config.js`（与 mvp 相同 content 路径 `./index.html`, `./src/**/*.{vue,ts}`） |
| 编辑器暗色 | 复用 `.editor-select`、slate 色系类名；**不引入** Naive UI / Element Plus 于 Phase 1–3 |

**Phase 4+ 可选**：属性面板复杂表单可局部引入 Naive UI（团队熟悉度来自 nova-admin），须单独评估包体积与主题一致性。

### 7.2 图标

| 项 | 选型 |
|----|------|
| 运行时 | `@iconify/vue` `^4.x` |
| 图标集 | `@iconify-json/tabler`（与 mvp 一致） |
| 初始化 | `iconSetup.ts` port（批量注册常用图标） |

### 7.3 字体

| 用途 | 包 |
|------|-----|
| 日期时间数码 | `@fontsource/share-tech-mono` |
| 表盘/其他 | 按 mvp 已有依赖同步 |

---

## 八、共享包与后端

### 8.1 `@mvp-vue/schema`

| 项 | 说明 |
|----|------|
| 来源 | Phase 0 **整包复制** `../mvp/packages/schema/src` → `packages/schema/src` |
| 包名 | `@mvp-vue/schema`（workspace） |
| 维护 | 重构期间以 React 版为 **上游**；仅当 Vue 需要新字段时双向评估是否回写 mvp |
| 导出 | 与 mvp 相同：`index.ts`、`mapRegions.ts` |

### 8.2 Server

| 阶段 | 策略 |
|------|------|
| Phase 0–3 | **直接运行** `../mvp` 的 `@mvp/server`（`pnpm --dir ../mvp dev:server`） |
| Phase 4+ | 可选复制为 `@mvp-vue/server` 或 monorepo 抽离公共 server 包 |

**API 基址不变**：`http://localhost:3002`，路径 `/api/pages`、`/api/data-proxy`、`/api/query`、`/api/demo/*` 等。

---

## 九、工具与质量

| 类别 | 选型 | 说明 |
|------|------|------|
| 组合式工具 | `@vueuse/core` | `useFullscreen`、`useResizeObserver`、`useEventListener` 等 |
| 剪贴板 | 原生 `navigator.clipboard` + fallback | port `copyTextToClipboard.ts` |
| Lint | ESLint 9 + `eslint-plugin-vue` | scaffold 时与 `@antfu/eslint-config` 二选一，团队统一即可 |
| 格式化 | 默认 ESLint fix | 不强制 Prettier |
| 测试 | **Phase 5** 再引入 Vitest + 少量 schema/工具函数单测 | 非阻塞首期交付 |
| E2E | 可选 Playwright | 画布拖拽回归 |

---

## 十、版本锁定（package.json 目标）

以下为 **计划锁定** 的主依赖范围（scaffold 时写入各子包）：

```jsonc
// 公共 devDependencies（根或各包）
"vue": "^3.5.13",
"typescript": "^5.5.4",
"vite": "^5.4.3",
"@vitejs/plugin-vue": "^5.2.1",
"vue-tsc": "^2.2.0",
"tailwindcss": "^3.4.10",
"pinia": "^2.2.6",
"@vueuse/core": "^11.3.0",
"echarts": "^5.5.1",
"@iconify/vue": "^4.2.0",
"@iconify-json/tabler": "^1.2.35",
"vue-draggable-plus": "^0.5.6"
```

Editor / Renderer 共享 `@mvp-vue/schema`；Server 初期不安装 Vue 依赖。

---

## 十一、明确不采用的方案

| 方案 | 原因 |
|------|------|
| React + Vue 微前端 | 双倍维护 componentMap / registry |
| Nuxt 3 | 无 SSR 需求，增加路由与部署复杂度 |
| Vue 2 / Options API 为主 | 与长期维护目标不符 |
| MobX / Vuex | Pinia 为 Vue 3 事实标准 |
| 重写后端为 Nest / Koa | 无业务收益 |
| 更换数据库 | SQLite 足够，与 mvp 共用数据 |

---

## 十二、参考工程索引

| 工程 | 路径 | 借鉴点 |
|------|------|--------|
| mvp (React) | `../mvp` | 功能基线、Schema、API、交互细节 |
| nova-admin | `~/nova-admin` | Vue3 + Vite + TS + pnpm 工程习惯（**不引入 Naive UI 至大屏编辑器首期**） |

---

## 十三、选型评审记录

| 日期 | 决策 |
|------|------|
| 2026-05-22 | 确立 Vue 3.5 + Pinia + vue-draggable-plus + 命令式 ECharts；Server 复用 mvp |
