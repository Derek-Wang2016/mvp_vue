# 开发交接：2026-11-15 提交汇总与明日上手清单

> 范围：`20f3f89..fb6598a` 共 5 个提交（另含 `20f3f89` 的形状旋转，见 §4.1、§5.1⑤）
> 用途：更换开发机器后的完整上手依据，涵盖 npm 依赖、数据库、设备 JSON、LVGL 端配套
> 详细专题文档见文末「相关文档」

---

## 0. 五分钟上手（先跑通再读细节）

```bash
# 1. 拉代码
cd ~/prj/mvp_vue
git pull                       # 目标 HEAD: fb6598a

# 2. 装依赖（含新增 3 个包与 workspace 软链）
pnpm install

# 3. 构建共享 schema 包 —— 漏了会启动失败
pnpm -F @mvp-vue/schema build

# 4. 验证 schema 构建产物存在
ls packages/schema/dist/hmiSample.js

# 5. 重启两个进程
pnpm dev:server                # 或在你惯用的 mvp 仓库启动
pnpm dev:hmi

# 6. 冒烟验证
curl http://localhost:3002/api/hmi/sample-sources
# 期望：返回数组里有一条 "builtin": true
```

打开 `http://localhost:5002`，能看到编辑器 + 左侧组件面板 + 右侧属性面板即为正常。

---

## 1. 本次几个提交做了什么

| commit | 标题 | 影响面 |
|---|---|---|
| `20f3f89` | 基础形状支持旋转 | Schema 新字段 + UI |
| `270d380` | 预览与截图、统一关闭按钮、内置样例只读 | **npm 依赖 + 数据库 + 新增 UI** |
| `8e01a15` | 跨机器同步文档 | 仅文档 |
| `32cb45e` | 数值卡/拆分块字符替换 | Schema 新字段 + UI |
| `c600a32` | 卡片格子底色与圆角 | Schema 新字段 + UI |
| `fb6598a` | 按钮图标独立尺寸与颜色 | Schema 新字段 + UI |
| `406b039` | 交接文档 | 仅文档 |

**一句话概括**：新增了「1:1 预览 + 截图导出」功能，把「样例数据」改为建表时写入的只读内置项，给卡片格子和数值卡加了 `replace`（字符替换）、`bg`（底色）、`radius`（圆角），给按钮图标加了 `icon_size`（尺寸）、`icon_color`（颜色），给矩形和圆形加了 `rotate`（旋转角度）。

---

## 2. npm 库修改

### 2.1 新增依赖

`packages/hmi/package.json`：

```json
"dependencies": {
  "@iconify-json/tabler": "^1.2.35",
  "@mvp-vue/schema": "workspace:*",    // 新增（workspace 内部包）
  "html2canvas": "^1.4.1",             // 新增（已弃用，见下）
  "modern-screenshot": "^4.7.0",       // 新增（实际使用）
  "pinia": "^2.2.6",
  "qrcode": "1.5.4",
  "vue": "^3.5.13"
}
```

**`modern-screenshot`** —— 截图功能核心。走 `foreignObject` + 浏览器原生排版，完整支持 CSS Grid/Flex。

**`html2canvas`** —— 最初采用，后发现**不支持 CSS Grid**（源码里搜不到 `grid-template-columns` 处理），卡片布局会塌陷成一列，导致文字错位、左右被裁。已换成 `modern-screenshot`。

> **待清理**：`html2canvas` 目前仍留在 `package.json` 里，代码中已无 import
> （仅 `PreviewDialog.vue` 里有一行解释性注释提到它）。可以执行
> `pnpm -F @mvp-vue/hmi remove html2canvas` 移除，约省 5 个传递依赖
> （`base64-arraybuffer`、`css-line-break` 等）。
> 移除后需重新 `pnpm install` 并确认 `pnpm-lock.yaml` 更新。

**`@mvp-vue/schema`** —— 从编辑器包首次引入，用于共享默认样例数据。

### 2.2 共享包新增导出

`packages/schema/src/hmiSample.ts`（新文件）：

```ts
export const HMI_DEFAULT_SAMPLE: Record<string, unknown>   // 17 个字段的默认样例
export const HMI_BUILTIN_SAMPLE_NAME = '默认样例'           // 内置样例名
export function hmiDefaultSampleJson(): string             // 上述数据的美化 JSON
```

`packages/schema/src/index.ts` 增加对应导出。

**设计意图**：这份数据以前在 `hmi/src/defaultDocument.ts` 和 `server/src/routes/hmiSampleSources.ts` 各存一份。现在收拢到 schema 包，编辑器默认文档、新建样例模板、服务端建表种子三处共用。

### 2.3 ⚠️ 必须构建 schema 包

`schema/package.json` 的 `main`/`types` 指向 `dist/`，而 `dist/` 被 `.gitignore` 排除。所以：

```bash
pnpm -F @mvp-vue/schema build
```

**漏掉的报错**（实测原文）：

```
ERR_MODULE_NOT_FOUND: Cannot find module
  '...\packages\schema\dist\hmiSample'
  imported from '...\packages\schema\dist\index.js'
```

**判断是否已构建**：

```bash
ls packages/schema/dist/hmiSample.js    # 有输出 = OK
```

> 以后每次修改 `packages/schema/src/**` 都要重新 build。这条已写入 `AGENTS.md` 的约定。

---

## 3. 数据库修改

### 3.1 改了什么

表 `HmiSampleSource` 新增一列：

```sql
"builtin" INTEGER NOT NULL DEFAULT 0
```

`builtin = 1` 表示内置样例，服务端拒绝 `PUT` / `DELETE`（返回 403）。

### 3.2 自动迁移，无需手工操作

迁移逻辑在 `packages/server/src/routes/hmiSampleSources.ts` 的 `ensureTable()`，**首次访问 `/api/hmi/sample-sources` 时触发**：

1. `CREATE TABLE IF NOT EXISTS` —— 表已存在，无副作用
2. `ALTER TABLE ... ADD COLUMN "builtin"` —— 老库补列，列已存在则吞掉异常
3. `SELECT ... WHERE builtin = 1` —— 已有内置样例则跳过种子
4. 没有则 `INSERT` 一条内置样例

### 3.3 不需要做的事

| 操作 | 结论 | 原因 |
|---|---|---|
| `prisma db push` | **不需要** | 该表不由 Prisma 迁移管理，`ensureDatabaseSchema.ts` 里查不到它 |
| `prisma generate` | 不需要 | Prisma Client 未加新 model，`builtin` 走 raw SQL |
| 手工 `ALTER TABLE` | 不需要 | 自动完成 |
| 备份数据库 | 建议但非必须 | 只加列不删数据 |

### 3.4 实测迁移结果

模拟老库（无 `builtin` 列 + 2 条用户样例）：

```
【迁移前】
  id=1  我的病区样例  active=1
  id=2  接口样例      active=0

【第 1 次迁移】seeded
  id=3  默认样例      builtin=1  jsonLen=440   ← 新增
  id=1  我的病区样例  builtin=0  jsonLen=21    ← 原样保留
  id=2  接口样例      builtin=0  jsonLen=2     ← 原样保留

【第 2 次迁移】skip-seed                       ← 幂等
【幂等检查】total=3, builtinCount=1
```

### 3.5 可能需要手动处理

如果那台机器跑过中途某个临时方案，库里可能有 `builtin=0` 的同名「默认样例」，新版会再插入一条 `builtin=1` 的，看起来是两条。

**判断**：

```bash
curl http://localhost:3002/api/hmi/sample-sources | grep -o '"builtin":[a-z]*'
```

**处理**：界面上删掉 `builtin=false` 那条（它是普通样例，可删）。若有手工改过的内容，先「另存为」保留再删。

---

## 4. 设备 JSON（导入/导出）变化

### 4.1 新增字段

设备 JSON 里，`pages.<name>.cards[].items[]` 的 item 新增以下字段：

| 字段 | 类型 | 说明 | 引入 |
|---|---|---|---|
| `replace` | `{from: string, to: string}[]` | 字符替换规则，按序执行 | `32cb45e` |
| `bg` | `string` | 格子底色，`#RRGGBB` 或 `color.字段` | `c600a32` |
| `radius` | `number` | 格子圆角（split 时为内部块圆角） | `c600a32` |

`pages.<name>.shapes[]` 里**按钮**（`type: "button"`）新增：

| 字段 | 类型 | 说明 |
|---|---|---|
| `icon_size` | `number` | 图标独立尺寸（像素）。缺省跟随文字字号 |
| `icon_color` | `string` | 图标独立颜色。缺省跟随文字颜色 `color` |

（引入于 `fb6598a`）

`pages.<name>.shapes[]` 里**矩形与圆形**（`type: "rect"` / `"circle"`）新增：

| 字段 | 类型 | 说明 |
|---|---|---|
| `rotate` | `number` | 绕中心旋转角度，单位度，范围 `-180..180`。缺省不写，等价 0 |

（引入于 `20f3f89`）

> 线段的旋转已经折算进 `x1` / `y1` / `x2` / `y2` 坐标，不写 `rotate` 字段。设备端无需为线段做旋转处理，按两个端点画线即可。

### 4.2 完整示例

**数值卡（item）**：

```json
{
  "type": "value",
  "prop": "DRUG_FEEDBACK",
  "title": "敏",
  "title_font": "num_large",
  "title_color": "#FF0000",
  "font": "35",
  "color": "#222222",
  "align": "start",
  "bg": "#FFF3CD",
  "radius": 8,
  "mask": "*",
  "mask_at": 2,
  "mask_n": 1,
  "replace": [
    { "from": ",", "to": "\\s\\s" }
  ]
}
```

**按钮（shape）**：

```json
{
  "type": "button",
  "x": 400, "y": 460, "w": 160, "h": 56,
  "text": "呼叫",
  "symbol": "CALL",
  "color": "#FFFFFF",
  "font": "status",
  "icon_size": 40,
  "icon_color": "#FF0000",
  "icon_pos": "left",
  "bg": "#0E3A5F",
  "radius": 8,
  "action": "page",
  "page": "index"
}
```

上面这段同时表达了「文字白色、图标红色、图标 40px 比文字更大」的配置。

**旋转矩形（shape）**：

```json
{
  "type": "rect",
  "x": 100, "y": 80, "w": 200, "h": 120,
  "rotate": 30,
  "bg": "#0E3A5F",
  "radius": 8
}
```

绕该矩形中心顺时针旋转 30°。`rotate` 缺省时不写，按 0 处理。

### 4.3 导出时的清理规则

**`replace`**：

- `from` 为空的条目被丢弃
- 全部为空时，整个 `replace` 字段不写

**`bg` / `radius`**：

- `bg` 为空字符串时由 `omitEmpty` 丢弃
- `radius` 为 `0` 时保留（`omitEmpty` 只跳过 `null` / `undefined` / `''`，0 会留下）

**`icon_size` / `icon_color`**：

- `icon_size` 未配置或 ≤ 0 时不写
- `icon_color` 未配置或为空白字符串时不写
- 两个都不写时，设备端按「跟随文字」处理，与旧版行为完全一致

**`rotate`**：

- 未配置时不写；配置为 `0` 时保留（理由同 `radius`，表示显式无旋转）
- 写入前在编辑器内已归一化到 `-180..180`，`rotateShape` 会把超出范围的角折算回来

> 如果希望 `radius: 0` 也不写，需要在 `omitEmpty` 里特殊处理 —— 当前没这么做，因为 0 有语义（显式无圆角 vs 未配置）。

### 4.4 向后兼容

- 旧 JSON（无 `replace` / `bg` / `icon_size` / `icon_color` / `rotate`）导入后行为完全不变
- `applyReplace(undefined)` 直接返回原文
- `cellBoxStyle()` 未配 `bg` 时不加 `background`，保持透明
- 按钮未配 `icon_size` 时图标尺寸回落为文字字号（原先硬编码 24px 的视觉差异见 6.5）
- 形状未配 `rotate` 时不加旋转，与旧版等价

> ⚠️ **一处视觉变化**：以前按钮的 SVG 图标固定渲染为 24×24px（`h-6 w-6`），现在未配 `icon_size` 时跟随文字字号。字号为 `default`(28) / `status`(30) 时图标会比之前更大，`num_large`(47) 更大。如果旧设计稿依赖 24px，需显式填 `icon_size: 24`。

---

## 5. LVGL 端配套修改（重点）

### 5.1 需要实现的五件事

> 五个字段组的实现顺序建议：先 `bg` / `radius`（纯样式），再 `icon_size` / `icon_color`，再 `rotate`，最后 `replace`（涉及文本处理链路）。

#### ① 字符替换（`replace`）

```c
// 取到字段原文后
char *text = get_field_value(obj, item->prop);

// 按数组顺序逐条替换
for (int i = 0; i < item->replace_count; i++) {
    char *to = unescape_replace_value(item->replace[i].to);
    text = replace_all(text, item->replace[i].from, to);
}

lv_label_set_text(label, text);
```

**四个必须对齐的点**：

1. **全部替换**，不是只替换第一处
   - C 不能直接用 `str.replace` 语义，需循环 `strstr` + 拼接
   - 等价 JS 的 `text.split(from).join(to)`

2. **按数组顺序执行**，前一条结果进入后一条
   - 例：`[{"from":",","to":"X"},{"from":"X","to":"Y"}]` → `"a,b"` 变成 `"aYb"`

3. **转义先还原**
   - `\s` → 空格（0x20）
   - `\t` → 制表符（0x09）
   - `\n` → 换行（0x0A）
   - `\\` → 单个反斜杠
   - 其余 `\x` 原样保留（避免吞掉路径里的反斜杠）

4. **顺序：先替换再遮罩**（数值卡）
   - 先 `applyReplace`，再 `applyMask`

#### ② 执行顺序

**数值卡（`value`）**：

```
原始值 → 字符替换 → 遮罩 → 显示
```

**拆分块（`split`）**：

```
原始值 → 按分隔符切分 → 对每一块替换 → 每块查颜色字典 → 显示
```

⚠️ **拆分块必须「先切分后替换」**。如果先替换、且规则把分隔符本身换掉了，就切不开：

```
原值 "防窒息,防坠床"，分隔符 ','
错误：先替换 ',' → ' ' 得 "防窒息 防坠床"，再切 ',' → 只有 1 块 ✗
正确：先切成 ["防窒息","防坠床"]，再逐块替换 ✓
```

#### ③ 格子底色与圆角（`bg` / `radius`）

```c
lv_obj_t *cell = ...;
if (item->bg) {
    lv_obj_set_style_bg_color(cell, lv_color_hex(parse_hex(item->bg)), 0);
    lv_obj_set_style_bg_opa(cell, LV_OPA_COVER, 0);
}
if (item->radius > 0) {
    lv_obj_set_style_radius(cell, item->radius, 0);
}
```

`bg` 支持 `color.字段` 表达式，需按样本数据查颜色字典：

```
"bg": "color.TEND_NAME"  →  取 sample["TEND_NAME"] 的文本，查 colors 字典
```

#### ④ 按钮图标独立尺寸与颜色（`icon_size` / `icon_color`）

按钮（`shape.type === "button"`）的两个新字段：

| 字段 | 类型 | 缺省行为 |
|---|---|---|
| `icon_size` | `number`（像素） | 未配置时，图标尺寸 = 文字字号 |
| `icon_color` | `string`（`#RRGGBB` 或 `color.字段`） | 未配置时，图标颜色 = 文字颜色 `color` |

**LVGL 实现要点**：LVGL 的 `LV_SYMBOL_*` 本质是字体，所以图标尺寸就是图标 label 的字号：

```c
lv_obj_t *icon_label = ...;
lv_obj_t *text_label = ...;

// 文字：始终用 font / color
lv_obj_set_style_text_font(text_label, resolve_font(btn->font), 0);
lv_obj_set_style_text_color(text_label, lv_color_hex(parse_hex(btn->color)), 0);

// 图标：有独立配置就用独立的，否则跟随文字
lv_obj_set_style_text_font(icon_label,
    resolve_font(btn->icon_size ? fmt_px(btn->icon_size) : btn->font), 0);
lv_obj_set_style_text_color(icon_label,
    lv_color_hex(parse_hex(btn->icon_color ? btn->icon_color : btn->color)), 0);
```

对于 SVG 图标（`svg` 字段），`icon_size` 决定渲染的 width/height，`icon_color` 决定填充色。

**注意**：`icon_size` 用像素数值，不是 `font` 那种预定义字号名（`default` / `status` / `num_large` / `num_huge`）。这样可以直接对齐设计稿上的图标视觉尺寸，不受字号档位限制。

#### ⑤ 形状旋转（`rotate`）

仅矩形（`rect`）和圆形（`circle`）带这个字段，线段的旋转已折算进端点坐标。

| 字段 | 类型 | 缺省行为 |
|---|---|---|
| `rotate` | `number`（度，`-180..180`） | 未配置时不旋转 |

**两个必须注意的点**：

1. **单位是 0.1 度**。`rotate: 30` 要传 `300`。
2. **pivot 默认是 `0,0`（左上角），不是中心**。不显式设中心点会得到完全不同的视觉效果。

```c
/* LVGL 9 */
lv_obj_set_style_transform_rotation(rect, shape->rotate * 10, 0);

/* LVGL 8.4 同名语义、不同函数名 */
lv_obj_set_style_transform_angle(rect, shape->rotate * 10, 0);

/* 两个版本都要设中心 pivot，否则绕左上角转 */
lv_obj_set_style_transform_pivot_x(rect, shape->w / 2, 0);
lv_obj_set_style_transform_pivot_y(rect, shape->h / 2, 0);
```

正角度在网页侧是顺时针（CSS `transform: rotate(30deg)`）。LVGL 的 `transform_rotation` 同样按顺时针解释，两边一致。上板后若发现方向相反，取反即可，编辑器侧不需要改。

旋转会让绘制区超出对象原始包围盒，LVGL 会按需扩层处理，通常不需要额外配置；但贴近屏幕边缘的图元旋转后可能被裁掉，设计时留点余量。

`circle` 本身轴对称，旋转只有配合非等比矩形或圆角才看得出差异，可以直接套用同一套代码。

#### ⑥ 不需要改动的地方

- 布局坐标：`x` / `y` / `w` / `h` 未变
- 卡片网格：`cols` / `rows` / `col_w` / `row_h` 未变
- 其他 item 字段：未增删
- `version` 仍为 `3`

### 5.2 建议的 LVGL 实现顺序

1. **先做 `bg` / `radius`** —— 最简单，纯样式设置
2. **再做 `icon_size` / `icon_color`** —— 也是纯样式，但要注意「未配置时回落到文字样式」
3. **再做 `rotate`** —— 纯样式，但必须记得设中心 pivot、角度乘 10
4. **再做 `replace`（数值卡）** —— 单次替换链路
5. **最后做 `replace`（拆分块）** —— 注意切分顺序

---

## 6. 界面变化（供对照验收）

### 6.1 新增「预览」对话框

工具栏「发布管理」右侧新增眼睛图标。点开：

- **顶部**：`1:1 · 1024×600` 徽章、截图倍率下拉（1×/2×/3×，默认 1×）、「截图并下载」蓝色按钮、红色 X 关闭
- **TAB 栏**：`index` / 其他页面，点击切换
- **左侧**：1:1 渲染，不可选中/拖动
- **右侧**：数据面板，17 个字段可实时修改，改完点「写回编辑器」才作用到编辑器

### 6.2 截图功能

- 输出 PNG，尺寸 = `screen.w × scale`
- 1× 得 1024×600，2× 得 2048×1200，3× 得 3072×1800
- 优先走系统保存框（`showSaveFilePicker`），不支持时退回浏览器下载

### 6.3 关闭按钮统一

所有对话框右上角改为红色 X 图标按钮（`DialogClose.vue`），替代原先的文字「关闭」或灰色 X。

### 6.4 样例数据对话框

- 列表第一条固定是「默认样例」，带橙色「内置」徽章
- 选中内置样例时：名称/JSON/模式切换全部禁用，保存和删除禁用
- 改内容必须点「另存为」，生成副本后自动切到副本且可编辑
- 「激活」始终可用

### 6.5 属性面板新增

| 卡片类型 | 新增项 | 位置 |
|---|---|---|
| `value` | 字符替换（增删改规则） | 「遮罩」下方 |
| `value` / `label` / `split` | 底色、格子圆角 | 「颜色」下方 |
| `split` | 字符替换（增删改规则） | 「默认底色」下方 |
| **`button`（图形）** | **「图标样式」区块：图标尺寸 px、图标颜色** | 「图标位置」下方 |
| **`rect` / `circle`（图形）** | **旋转角度** | 属性面板末尾 |

### 6.6 形状旋转

矩形和圆形的属性面板末尾新增「旋转角度」，范围 `-180..180`，步进 1 度。

画布上选中矩形后，包围框的四角外侧会有旋转手柄；拖动手柄即可旋转，按住 `Shift` 按 15° 吸附。

线段没有这个输入框，它的角度由 `x1` / `y1` / `x2` / `y2` 决定；改端点即改变角度。

### 6.7 按钮图标样式

按钮形状的属性面板在「图标位置」下方新增「图标样式」区块：

- **图标尺寸 px**：数字输入。留空时 placeholder 显示当前会实际用到的值（取自字号或按钮高度）
- **图标颜色**：颜色选择器，可填 `#RRGGBB` 或 `color.字段`。留空时跟随文字颜色

这两个值分别控制图标，文字仍由「字号」和「文字颜色」控制，互不干扰。

**视觉变化提示**：以前按钮的 SVG 图标固定 24×24px，现在未显式配置 `icon_size` 时跟随文字字号。已有设计稿如果依赖原来的 24px，需要补填 `icon_size: 24`。

---

## 7. 明天上手的验证清单

按顺序走，每步都应通过。任一步失败，查文末「排查」。

### 7.1 环境

- [ ] `git log --oneline -1` 显示 `fb6598a`（或文档对应的最新提交）
- [ ] `ls packages/schema/dist/hmiSample.js` 有输出
- [ ] `curl http://localhost:3002/api/hmi/sample-sources` 返回含 `"builtin":true`
- [ ] 编辑器打开 `http://localhost:5002` 无报错

### 7.2 预览与截图

- [ ] 点眼睛图标，弹出预览窗，左侧画面 1:1
- [ ] 点画布上的元素，没有选中框（只读）
- [ ] 改右侧某个字段值，左侧立即变化
- [ ] 「截图并下载」→ 得到 1024×600 PNG
- [ ] 倍率切 2×，再截图 → 2048×1200
- [ ] 点 TAB 切页正常

### 7.3 样例数据

- [ ] 打开「样例数据」，列表有一条「默认样例」带「内置」徽章
- [ ] 名称、JSON 输入框均为禁用
- [ ] 「保存」「删除」禁用，「另存为」「激活」可用
- [ ] 点「另存为」→ 出现「默认样例 副本」且变为可编辑
- [ ] 删掉副本，数据库记录数回到 1

### 7.4 字符替换

- [ ] 选中 `DRUG_FEEDBACK` 数值卡 → 属性面板有「字符替换」
- [ ] 加规则 `,` → `\s\s`，画布显示两个空格
- [ ] 「设备 JSON」里该 item 出现 `"replace":[{"from":",","to":"\\s\\s"}]`
- [ ] 选中 `SAFETAKECARE` 拆分块 → 也有「字符替换」
- [ ] 加规则 `窒息` → `S`，画布「防窒息」变「防S」，「防坠床」不变

### 7.5 底色与圆角

- [ ] 任一格子 → 「底色，留空透明」输入 `#FFF3CD`，画布该格变淡黄
- [ ] 设备 JSON 里出现 `"bg":"#FFF3CD"`
- [ ] 清空底色 → 恢复透明
- [ ] 「格子圆角」设 8 → 该格四角变圆

### 7.6 按钮图标样式

- [ ] 从左侧拖入一个「按钮」，选中它
- [ ] 属性面板「图标位置」下方出现「图标样式」区块
- [ ] 「LVGL 图标」选 `CALL`，「文字」填「呼叫」
- [ ] 「图标尺寸 px」填 `40` → 画布上图标明显变大（比文字大）
- [ ] 「图标颜色」填 `#FF0000` → 图标变红，文字仍是白色
- [ ] 「设备 JSON」里该 button 出现 `"icon_size":40,"icon_color":"#FF0000"`
- [ ] 清空图标尺寸 → 图标回落到与文字同尺寸
- [ ] 清空图标颜色 → 图标回落到白色（跟随文字）

> 若按钮里用的是 SVG 图标（而非 LVGL symbol），行为一致；但需注意 SVG 的染色走 `paintSvg`，仅支持单色图标的整体替换。

### 7.7 形状旋转

- [ ] 拖入一个矩形，选中
- [ ] 属性面板末尾出现「旋转角度」
- [ ] 填 `30` → 画布上矩形绕自身中心顺时针转 30°
- [ ] 「设备 JSON」里该 rect 出现 `"rotate":30`
- [ ] 拖包围框的旋转手柄 → 角度实时变化
- [ ] 按住 `Shift` 拖动 → 角度吸附到 15° 的整数倍
- [ ] 填 `200` → 自动折算为 `-160`
- [ ] 拖入一个圆形，同样有「旋转角度」
- [ ] 拖入一条线段 → 没有「旋转角度」输入框

---

## 8. 排查

| 症状 | 原因 | 处理 |
|---|---|---|
| `Cannot find module ...schema/dist/hmiSample` | schema 未构建 | `pnpm -F @mvp-vue/schema build` |
| `Cannot find module '@mvp-vue/schema'` | 未装依赖或软链缺失 | `pnpm install` |
| `does not provide an export named 'HMI_DEFAULT_SAMPLE'` | dist 是旧的 | 重新 build |
| 样例接口返回 404 / 空数组 | 后端未重启 | 重启 `dev:server` |
| 样例列表有两条「默认样例」 | 历史临时方案残留 | 删掉 `builtin=false` 那条 |
| 截图文字错位、左右被裁 | 仍在用 html2canvas | 确认 import 的是 `modern-screenshot` |
| 截图导出后文件找不到 | 内置浏览器拦截下载 | 已改 `showSaveFilePicker`，会弹系统保存框 |
| 属性面板看不到「字符替换」 | 选中的不是 value / split | 检查选中类型 |
| 属性面板看不到「图标样式」 | 选中的不是 button | 检查选中类型 |
| 属性面板看不到「旋转角度」 | 选中的不是 rect / circle | 线段无此项，改用端点 |
| 旋转后绕左上角转 | LVGL 未设 pivot | `transform_pivot_x/y` 设为 `w/2`、`h/2` |
| 旋转角度小了 10 倍 | 忘了乘以 10 | `transform_rotation` 单位是 0.1 度 |
| 按钮图标突然变大 | 未配 `icon_size`，跟随了新字号 | 显式填 `icon_size` |
| 点删除内置样例却成功 | 后端是旧进程 | 重启后端，确认返回 403 |
| 浏览器标签页图标没变 | 缓存 | `Ctrl+Shift+R` |

---

## 9. 提交明细（按文件）

### 9.1 新增文件
| 文件 | 说明 |
|---|---|
| `packages/hmi/src/components/PreviewDialog.vue` | 预览 + 截图对话框（411 行） |
| `packages/hmi/src/components/DialogClose.vue` | 统一的红色 X 关闭按钮 |
| `packages/hmi/src/icons/tabler.ts` | `tabler()` 图标函数（从 App.vue 抽出） |
| `packages/hmi/public/favicon.svg` | HMI 的 favicon |
| `packages/schema/src/hmiSample.ts` | 默认样例数据单一来源 |
| `doc/hmi-sample-sync.md` | 内置样例跨机器同步说明 |
| `doc/hmi-replace-rules.md` | 字符替换完整设计文档 |
| `AGENTS.md` | 与 CLAUDE.md 同内容（Cursor 规则文件） |

### 9.2 修改文件

| 文件 | 改动 |
|---|---|
| `packages/hmi/src/App.vue` | 预览入口、关闭按钮替换、5 处补关闭入口 |
| `packages/hmi/src/types.ts` | `HmiItem` 新增 `bg`、`replace`；`HmiShape.button` 新增 `icon_size`、`icon_color`；`HmiShape.rect` 新增 `rotate`；`HmiReplaceRule` 接口 |
| `packages/hmi/src/resolve.ts` | `applyReplace`、`unescapeReplaceValue`、导出清理；按钮导出补 `icon_size` / `icon_color` |
| `packages/hmi/src/components/Stage.vue` | `cellBoxStyle`、`splitParts`、`maskedValue` 接入替换；按钮图标改用 `buttonIconColor` 与 `symbolSize`；形状应用 `rotate` |
| `packages/hmi/src/components/PropertyPanel.vue` | 字符替换区块、底色/圆角输入、按钮「图标样式」区块、矩形/圆形「旋转角度」 |
| `packages/hmi/src/components/SampleSourceDialog.vue` | 内置样例只读、另存为 |
| `packages/hmi/src/defaultDocument.ts` | 改用 schema 包的默认样例 |
| `packages/hmi/src/api.ts` | `HmiSampleSource` 加 `builtin` |
| `packages/hmi/src/components/HmiCanvas.vue` | 预览打开时屏蔽画布快捷键；旋转手柄与拖拽旋转 |
| `packages/hmi/src/components/ImageLibraryDialog.vue` 等 | 关闭按钮替换 |
| `packages/hmi/src/stores/hmiStore.ts` | `rotateShape`（矩形/圆形存角度，线段折算端点）、`normalizeRotation` |
| `packages/server/prisma/schema.prisma` | `HmiSampleSource` 加 `builtin` |
| `packages/server/src/routes/hmiSampleSources.ts` | 建表补列 + 种子 + 403 拦截 |

---

## 10. 遗留项（可选，不阻塞）

| 项 | 说明 |
|---|---|
| 移除 `html2canvas` | 已无引用，可 `pnpm -F @mvp-vue/hmi remove html2canvas` |
| 字符替换支持正则 | 当前 `from` 是字面匹配。如需「连续多逗号换成一个」，要加 `mode: "regex"` |
| 截图倍率持久化 | 当前每次打开预览都回到 1× |
| `label` / `qrcode` 的字符替换 | 只有 `value` / `split` 开放 |
| `radius: 0` 不写入 JSON | 当前 0 会保留，如需精简可改 `omitEmpty` |
| 图标与文字间距 | 按钮内图标与文字目前用固定 `gap-1`（4px），未暴露配置 |
| 静态图标形状的尺寸颜色 | `shape.type === "icon"` 已有 `color`，但没有独立 `icon_size`（尺寸由 `w`/`h` 控制） |

---

## 相关文档

| 文档 | 用途 |
|---|---|
| [`hmi-sample-sync.md`](./hmi-sample-sync.md) | 内置样例的数据库迁移细节、回滚方法、排查清单 |
| [`hmi-replace-rules.md`](./hmi-replace-rules.md) | 字符替换的数据结构、执行顺序、LVGL 实现、验证步骤 |
| [`tech-stack.md`](./tech-stack.md) | 技术选型 |
| [`dev-plan.md`](./dev-plan.md) | 分阶段计划 |
| [`parity-checklist.md`](./parity-checklist.md) | 功能对等验收 |
