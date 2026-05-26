# 功能对等验收清单（React mvp → Vue mvp_vue）

> 最后更新: 2026-05-23  
> 基线版本: `../mvp`（截至 2026-05-21 的 `doc/dev-plan.md`）  
> 验收方式: 每项需在 **相同 `schemaJson`** 下，编辑器操作与渲染器表现与 React 版一致（允许 ±1px 布局误差）。

---

## 使用说明

- `[ ]` 未开始 · `[~]` 进行中 · `[x]` 已完成  
- 每完成一项，在 `doc/dev-plan.md` 对应 Phase 勾选  
- **P0** = 阻塞联调 · **P1** = 核心体验 · **P2** = 增强

---

## A. 基础设施

| ID | 优先级 | 项 | 状态 |
|----|--------|-----|------|
| A1 | P0 | pnpm workspace 四包可安装、可 build | [x] |
| A2 | P0 | `@mvp-vue/schema` 与 mvp schema 导出一致 | [x] |
| A3 | P0 | 对接 `localhost:3002` API（pages / data-proxy / query） | [x] |
| A4 | P1 | editor :5000、renderer :5001 端口固定 | [x] |
| A5 | P1 | Tailwind 暗色编辑器样式、`.editor-select` | [x] |

---

## B. 编辑器 — 布局与画布

| ID | 优先级 | 项 | 状态 |
|----|--------|-----|------|
| B1 | P0 | 三段式布局（组件面板 \| 画布 \| 属性面板） | [x] |
| B2 | P0 | 画布设计稿尺寸、scale 自适应 | [x] |
| B3 | P0 | 从面板拖入组件到画布（缩放坐标正确） | [x] |
| B4 | P0 | 画布上组件可拖动移动（scale 补偿） | [x] |
| B5 | P0 | 8 方向 resize，最小 30×20 | [x] |
| B6 | P0 | 单选、Shift 多选、框选 | [x] |
| B7 | P1 | 多选整体拖动 | [x] |
| B8 | P1 | 网格线开关 | [x] |
| B9 | P1 | 撤销 / 重做（50 步）+ 工具栏按钮 | [x] |
| B10 | P1 | 层级：置顶/置底/上/下层 | [x] |
| B11 | P1 | Delete / 右键菜单删除 | [x] |
| B12 | P1 | Ctrl+S 保存、打开对话框、URL `?id=` 加载 | [x] |
| B13 | P2 | 文本双击画布内联编辑 | [ ] |

---

## C. 编辑器 — 属性与数据

| ID | 优先级 | 项 | 状态 |
|----|--------|-----|------|
| C1 | P0 | `editorRegistry` 12 类型注册完整 | [x] |
| C2 | P0 | 页面属性：尺寸预设、底图、透明度 | [x] |
| C3 | P1 | 页面级数据源 CRUD（REST/SQL/静态 JSON） | [x] |
| C4 | P1 | 颜色/图标/缩略语字典 | [x] |
| C5 | P1 | 组件数据 Tab、数据源绑定角标 | [x] |
| C6 | P2 | JSON 查看/导出、组件 props JSON 对话框 | [x] |
| C7 | P2 | 从 API 导入卡片字段、字典 JSON 导入 | [x] |

---

## D. 渲染器

| ID | 优先级 | 项 | 状态 |
|----|--------|-----|------|
| D1 | P0 | `?id=` 加载 Schema，错误/加载态 | [x] |
| D2 | P0 | 适应窗口 scale + 居中 | [x] |
| D3 | P0 | `?fullscreen=1` 1:1 模式 + 全屏按钮 + Esc 同步 | [x] |
| D4 | P0 | `componentMap` 12 类型运行时渲染 | [x] |
| D5 | P0 | text / image / table / datetime / analog-clock | [x] |
| D6 | P0 | bar / line / pie ECharts + 字段映射 | [x] |
| D7 | P1 | DataContext 轮询、setOption 不闪烁 | [x] |
| D8 | P1 | card-list 分页、字段布局、tag 字典色 | [~] |
| D9 | P1 | map 全国/省级、REST 绑定、`data` 路径 | [x] |
| D10 | P1 | page-nav-button 跳转 | [x] |
| D11 | P2 | 水印 overlay（若 schema 含配置） | [x] |

---

## E. 组件类型明细（12）

| type | Editor 预览 | Renderer | 状态 |
|------|-------------|----------|------|
| text | [x] | [x] | [x] |
| image | [x] | [x] | [x] |
| bar-chart | [x] | [x] | [x] |
| line-chart | [x] | [x] | [x] |
| pie-chart | [x] | [x] | [x] |
| table | [x] | [x] | [x] |
| datetime | [x] | [x] | [x] |
| analog-clock | [x] | [x] | [x] |
| page-nav-button | [x] | [x] | [x] |
| card-list | [x] | [~] | [~] |
| map | [x] | [x] | [x] |
| iframe | [ ] | [ ] | 基线未实现，可延后 |
| video | [ ] | [ ] | 基线未实现，可延后 |

---

## F. 联调 Mock（共用 mvp server）

| ID | 项 | 状态 |
|----|-----|------|
| F1 | `GET /api/demo/card-list` + card-list 组件 | [~] |
| F2 | `GET /api/demo/map-stats` + map 组件 | [~] |
| F3 | `GET /api/demo/live-data` 兼容 | [~] |
| F4 | CoinGecko / SQL / 静态 JSON 演示页可加载 | [~] |

---

## G. 数据持久化

| ID | 项 | 状态 |
|----|-----|------|
| G1 | POST 新建页面、PUT 更新、GET 列表/详情 | [~] |
| G2 | React 版保存的页面在 Vue 渲染器正常显示 | [~] |
| G3 | Vue 版保存的页面在 React 渲染器正常显示（回归） | [~] |

---

## 回归测试页建议（沿用 mvp 数据库 id）

| id | 用途 |
|----|------|
| 6 | 多数据源 + 图表 + 表 |
| 7 | 轮询刷新 |
| 8 | CoinGecko 代理 |
| 含 map / card-list 的页面 | 按 README 配置新建或沿用已有 |
