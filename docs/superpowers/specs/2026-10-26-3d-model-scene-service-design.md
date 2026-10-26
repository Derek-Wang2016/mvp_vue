# 3D 模型与场景服务设计（mvp_vue 服务端）

- 日期：2026-10-26
- 状态：已确认，待实现
- 目标工程：`C:\HOME\VUE\prj\mvp_vue\packages\server`
- 数据来源参考：`C:\HOME\REACT\prj\3ddemo`（场景格式与现有模型目录）

## 1. 背景与目标

`mvp_vue` 服务端原本为 2D 组态大屏提供 Fastify + Prisma + SQLite 服务，后续会逐步合并 2D 与 3D 组态能力。本轮先为 3D 组态补齐服务端基础设施：

- 可增删改的模型分类。
- 可配置、可复用的系统模型（模板）。
- 用户上传的 GLB 导入模型。
- 已编辑场景 JSON 的存储。
- GLB / 缩略图等二进制文件的统一存储与下载。

本轮只做服务端。3ddemo 前端改为消费这些接口、模板实例化 UI、导入模型操作界面等留到后续 spec。

## 2. 范围

### 本轮包含

- 5 张新表：`ModelCategory`、`AssetFile`、`SystemModel`、`ImportedModel`、`Scene`。
- 分类 / 文件 / 系统模型 / 导入模型 / 场景的 REST API。
- 运行时模型库接口 `GET /api/3d/model-library`，系统模型部分与 3ddemo 现有 `ModelEntry` 结构兼容。
- 启动时增量建表（沿用 `ensureDatabaseSchema` 模式）。
- 一次性 seed 脚本：导入现有 `catalog.json`、`hospital-ward.json` 与 8 个内置设备 GLB 副本。
- 单元测试与接口集成测试。

### 本轮不包含

- 鉴权与多租户（现有服务端同样没有）。
- 场景草稿/发布双表或发布流程。
- 服务端几何实例化（房间尺寸 → 床位排布仍由编辑器负责）。
- 导入模型的前端上传/摆放界面。
- 场景分类、场景版本历史。
- 将已有二进制文件迁移到对象存储。

## 3. 关键决策

| 决策点 | 结论 | 理由 |
|---|---|---|
| 系统模型与导入模型 | 分两张表 | 字段差异大，校验与列表语义更清晰 |
| 分类 | 独立 `ModelCategory` 表，扁平，两表共用 | 可增删改，改分类名不影响模型引用 |
| 模型参数存储 | 常用字段建列 + `configJson` | 尺寸等可查询，类型专属参数扩展不用迁移 |
| 模板与场景实例 | 场景保存时快照完整配置 | 旧场景可复现，改模板只影响新实例 |
| 场景表 | 单表 | 本轮无发布需求 |
| GLB 存储 | 独立 `AssetFile` 表，BLOB，sha256 去重 | 多模型可共用文件、便于缓存、未来可换对象存储 |
| 导入格式 | 仅 `.glb` | 与 3ddemo 加载方式一致，避免外部纹理依赖 |
| 存量数据 | 一次性 seed 脚本（默认仅空表写入） | 不污染生产数据 |
| 实例化位置 | 编辑器（前端） | 几何逻辑不重复，服务端职责单一 |

## 4. 数据模型

所有表通过 Prisma model 定义，同时在 `ensureDatabaseSchema` 中以 `CREATE TABLE IF NOT EXISTS` 增量补齐，保持现有部署方式（无需 `prisma db push` 即可启动）。

### 4.1 ModelCategory

| 字段 | 类型 | 约束 |
|---|---|---|
| id | Int | PK autoincrement |
| name | String | unique，1–40 字符 |
| sortOrder | Int | 默认 0，列表升序 |
| createdAt | DateTime | 默认当前时间 |
| updatedAt | DateTime | 自动更新 |

共用分类：系统模型与导入模型都可以引用同一分类（例如“医疗设备”下同时有内置监护仪和上传的呼吸机）。分类被任一模型引用时禁止删除。

### 4.2 AssetFile

| 字段 | 类型 | 约束 |
|---|---|---|
| id | Int | PK autoincrement |
| name | String | 原始文件名，1–200 字符 |
| mime | String | `model/gltf-binary` 或图片 MIME |
| size | Int | 字节数，≤ 50MB |
| sha256 | String | unique |
| data | Bytes | BLOB |
| createdAt | DateTime | 默认当前时间 |

- 允许的 MIME：`model/gltf-binary`、`image/png`、`image/jpeg`、`image/webp`。
- GLB 额外校验文件头 4 字节为 `glTF`。
- 相同 `sha256` 已存在时复用已有记录（不重复写入）。
- 列表 / 详情接口永远不返回 `data`。

### 4.3 SystemModel（系统模型模板）

| 字段 | 类型 | 约束 |
|---|---|---|
| id | Int | PK autoincrement |
| key | String | unique，`^[a-z0-9][a-z0-9-]*$`，1–64 字符 |
| name | String | 1–80 字符 |
| categoryId | Int? | FK → ModelCategory，删除受引用限制 |
| kind | String | `room` 或 `device` |
| width | Float? | 米，模型占地宽（X） |
| depth | Float? | 米，模型占地深（Z） |
| height | Float? | 米，设备高度 / 房间墙高 |
| fileId | Int? | FK → AssetFile；房间壳体可为空 |
| thumbnailFileId | Int? | FK → AssetFile（图片） |
| configJson | String | 默认 `"{}"`，按 kind 校验 |
| createdAt / updatedAt | DateTime | |

索引：`@@index([categoryId, kind])`。

`key` 是稳定标识，沿用现有模型 ID（`room-ward`、`device-bed` 等）。场景 JSON 保存的是快照，因此修改 `key` 不会影响旧场景；`key` 仍用于运行时模型库输出。

### 4.4 ImportedModel（导入模型）

| 字段 | 类型 | 约束 |
|---|---|---|
| id | Int | PK autoincrement |
| name | String | 1–80 字符 |
| categoryId | Int? | FK → ModelCategory，删除受引用限制 |
| fileId | Int | FK → AssetFile，必填 |
| thumbnailFileId | Int? | FK → AssetFile（图片） |
| width / depth / height | Float? | 米，摆放占地与高度；可手工填写 |
| configJson | String | 默认 `"{}"` |
| createdAt / updatedAt | DateTime | |

`configJson` 存放导入模型校准参数，见 5.3。

### 4.5 Scene（场景）

| 字段 | 类型 | 约束 |
|---|---|---|
| id | Int | PK autoincrement |
| name | String | 1–120 字符 |
| description | String? | ≤ 500 字符 |
| sceneJson | String | 完整 `SceneDocument v2` 快照 |
| thumbnailFileId | Int? | FK → AssetFile（图片） |
| createdAt / updatedAt | DateTime | |

服务端对 `sceneJson` 只做轻量校验：

- 可解析为对象；
- `version` 存在且为数字；
- `rooms`、`nodes`、`modelLibrary` 均为数组。

几何级 schema 仍由 3ddemo 的 zod 校验负责。

### 4.6 关系与删除策略

- 所有外键在数据库层使用 `ON DELETE RESTRICT`；应用层捕获后返回 `409` 与可读错误信息。
- 删除系统模型 / 导入模型不影响已保存场景（快照）。
- 删除被引用的 `AssetFile` 返回 `409`，提示被哪些资源引用。
- 删除被引用的分类返回 `409`。

## 5. configJson 结构

`configJson` 是数据库列；API 请求与响应中的字段名为 `config`，由 zod 校验。未知顶层键保留（passthrough），方便后续扩展而不破坏旧记录。校验失败返回 `400`，`field` 使用点路径（例如 `config.bedLayout.count`）。

### 5.1 房间模板（`kind = "room"`）

```json
{
  "render": "shell",
  "defaultKind": "room",
  "walls": { "front": true, "back": true, "left": true, "right": true },
  "door": {
    "side": "front",
    "type": "single",
    "margin": 0.9,
    "from": "left",
    "open": false
  },
  "windows": {
    "side": "back",
    "width": 1.7,
    "count": 2,
    "from": "left",
    "margin": 0.6
  },
  "bathroomCorner": "front-left",
  "bedLayout": {
    "count": 4,
    "placement": "both-sides",
    "gap": 0.8,
    "aisle": 1.6
  },
  "wallColor": "#dfe7ef",
  "floorColor": "#c8b89a",
  "doorColor": "#9a6b3f",
  "showName": true
}
```

- `render`：`glb | floor | shell`，默认 `shell`。
- `defaultKind`：`room | corridor`，默认 `room`。
- `door.side` / `windows.side`：`front | back | left | right`。
- `door.type`：`single | double`。
- `door.from` / `windows.from`：`left | right`。
- `bathroomCorner`：`front-left | front-right | back-left | back-right`，或 `null` 表示无洗手间。
- `bedLayout.count`：1–10；`gap`、`aisle` 为正数；`placement`：`both-sides | left | right`。
- 房间的 `width` / `depth` / `height` 取自 `SystemModel` 列，不放进 configJson。

### 5.2 设备模板（`kind = "device"`）

```json
{
  "deviceKind": "bed",
  "tagPrefix": "BED",
  "initialStatus": "standby",
  "metrics": [],
  "labelOffset": [0, 1.5, 0],
  "lampOffset": [0, 1.45, 0],
  "screen": {
    "renderer": "bedside",
    "position": [0, 0.86, 0.031],
    "size": [0.58, 0.36]
  },
  "statusStrip": {
    "position": [0, 1.095, 0.02],
    "size": [0.6, 0.024]
  },
  "states": [
    {
      "id": "occupancy",
      "label": "床位状态",
      "defaultValue": "vacant",
      "targets": ["*"],
      "values": [
        { "id": "vacant", "label": "空床", "color": "#cfe3f3", "opacity": 0.12 },
        { "id": "occupied", "label": "有人", "color": "#efe9dc" }
      ]
    }
  ],
  "footprint": [2.1, 1.063],
  "castShadow": true,
  "receiveShadow": true
}
```

- `deviceKind`：`rack | ahu | imaging | monitor | gas | bed | bedside | callhost`，必填。
- `initialStatus`：`normal | warning | alarm | standby | calling | emergency`。
- `screen.renderer`：`bedside | callhost`。
- `screen`、`statusStrip`、`states`、`metrics` 可选，默认空。
- 设备 `width` / `depth` 优先取列值，为空时回退到 `config.footprint`。

### 5.3 导入模型（`ImportedModel.configJson`）

```json
{
  "scale": 1,
  "rotationY": 0,
  "offset": [0, 0, 0],
  "castShadow": true,
  "receiveShadow": true,
  "labelOffset": [0, 2, 0]
}
```

- `scale`：正数，统一缩放。
- `rotationY`：弧度，与 3ddemo / three.js 一致。
- `offset`：局部坐标原点校正，单位米。
- 全部可选。

## 6. API 设计

统一前缀 `/api/3d`。错误响应统一为 `{ "error": "可读信息", "field"?: "点路径" }`。状态码：`400` 参数错误、`404` 不存在、`409` 冲突/被引用、`413` 超限。

### 6.1 分类

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/3d/categories` | 按 `sortOrder`、`id` 升序；返回 `{ id, name, sortOrder, updatedAt }` |
| POST | `/api/3d/categories` | body `{ name, sortOrder? }`；重名 `409` |
| PUT | `/api/3d/categories/:id` | body `{ name?, sortOrder? }` |
| DELETE | `/api/3d/categories/:id` | 被引用时 `409` |

### 6.2 文件

| 方法 | 路径 | 说明 |
|---|---|---|
| POST | `/api/3d/files` | `multipart/form-data`，字段名 `file`；返回 `{ id, name, mime, size, sha256, url, deduplicated }` |
| GET | `/api/3d/files/:id` | 原始二进制；`Content-Type` 按 mime；`ETag` 为 sha256；`Cache-Control: public, max-age=31536000, immutable`；`?download=1` 追加附件头 |
| GET | `/api/3d/files/:id/meta` | `{ id, name, mime, size, sha256, createdAt }`，不含二进制 |
| DELETE | `/api/3d/files/:id` | 被引用时 `409` |

上传规则：

- 单文件 ≤ 50MB（`@fastify/multipart` 的 `limits.fileSize`），单请求 1 个文件。
- 按文件魔数识别 GLB / PNG / JPEG / WEBP，并校验 GLB 魔数 `glTF`；不以扩展名或请求 MIME 作为判定依据。
- 去重命中返回 `200` 且 `deduplicated: true`；新建返回 `201`。

### 6.3 系统模型

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/3d/system-models?categoryId=&kind=&q=` | 列表；默认不含 `configJson`；`q` 匹配 `key`/`name`；按 `updatedAt` 降序 |
| GET | `/api/3d/system-models/:idOrKey` | 数字按 id 查询，否则按 key；详情包含解析后的 `config` |
| POST | `/api/3d/system-models` | 校验 `key` 唯一、`kind` 枚举、尺寸为正数、config 合法 |
| PUT | `/api/3d/system-models/:id` | 全量更新可变字段；`key` 变更需重新查重 |
| DELETE | `/api/3d/system-models/:id` | 删除后旧场景不受影响 |

列表项形状：

```json
{
  "id": 1,
  "key": "room-ward",
  "name": "病房",
  "kind": "room",
  "category": { "id": 1, "name": "房间" },
  "width": 4.2,
  "depth": 5,
  "height": 2.8,
  "fileUrl": null,
  "thumbnailUrl": null,
  "createdAt": "...",
  "updatedAt": "..."
}
```

详情额外包含 `config`（对象）。`fileUrl` / `thumbnailUrl` 为 `/api/3d/files/:id` 或 `null`。

### 6.4 导入模型

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/3d/imported-models?categoryId=&q=` | 列表，含 `fileUrl`、`thumbnailUrl`、`config`；分页暂不做 |
| GET | `/api/3d/imported-models/:id` | 详情 |
| POST | `/api/3d/imported-models` | body `{ name, categoryId?, fileId, thumbnailFileId?, width?, depth?, height?, config? }`；`fileId` 必须存在且为 GLB |
| PUT | `/api/3d/imported-models/:id` | 全量更新可变字段 |
| DELETE | `/api/3d/imported-models/:id` | 不自动删除 `AssetFile` |

### 6.5 运行时模型库

`GET /api/3d/model-library`

返回：

```json
{
  "system": [ /* 与 3ddemo ModelEntry 兼容 */ ],
  "imported": [ /* source: "imported" 的扩展条目 */ ]
}
```

- `system` 中房间条目输出 `{ id: key, label: name, category: "room", render, url?, footprint: [width, depth], height, defaultKind }`；仅当 `render = "glb"` 且 `fileId` 存在时带 `url`。
- `system` 中设备条目输出 `{ id: key, label: name, category: "device", url, kind: deviceKind, tagPrefix, initialStatus, metrics, labelOffset, lampOffset, screen?, statusStrip?, states?, footprint? }`。
- 设备没有 `fileId` 时跳过该条并在响应头 `X-Skipped-Models` 中记录 key，避免输出不可加载模型。
- `imported` 条目输出 `{ id: "imported-<id>", label: name, category: "device", source: "imported", url, footprint, config }`。`source` 是本设计新增字段，前端后续按需扩展类型。

### 6.6 场景

| 方法 | 路径 | 说明 |
|---|---|---|
| GET | `/api/3d/scenes` | 元数据列表：`{ id, name, description, thumbnailUrl, createdAt, updatedAt }` |
| POST | `/api/3d/scenes` | body `{ name, description?, sceneJson, thumbnailFileId? }` |
| GET | `/api/3d/scenes/:id` | 元数据 + `scene`（解析后的对象） |
| PUT | `/api/3d/scenes/:id` | 全量替换 `sceneJson` 等字段 |
| DELETE | `/api/3d/scenes/:id` | 删除场景，不删文件 |

`sceneJson` 允许对象或 JSON 字符串；存储时统一序列化为字符串。单次请求仍受现有 8MB `bodyLimit` 限制。

## 7. 依赖与工程调整

- 新增运行时依赖：`zod`、`@fastify/multipart`。
- 新增开发依赖：`vitest`。
- 新增 npm scripts：
  - `db:seed:3d`：`tsx prisma/seed3d.ts`
  - `test`：`vitest run`
- 为便于集成测试，将 `src/index.ts` 中的应用装配抽到 `src/app.ts`：

```ts
export function buildApp(prisma: PrismaClient): FastifyInstance
```

`index.ts` 保持现有职责：创建 `PrismaClient`、调用 `buildApp`、执行 `ensureDatabaseSchema`、监听 3002。

- `prisma/schema.prisma` 增加 5 个 model。
- `src/ensureDatabaseSchema.ts` 追加 5 个迁移步骤（id 使用 `2026-10-26-3d-*`），DDL 与 Prisma 定义保持一致，并创建唯一索引与普通索引。

## 8. Seed 脚本

资源位置：`packages/server/prisma/seed-assets/`

```
seed-assets/
├── catalog.json                 # 从 3ddemo/public/models/catalog.json 复制
├── scenes/hospital-ward.json    # 从 3ddemo/public/scenes/hospital-ward.json 复制
└── models/                      # 8 个设备 GLB 副本
    ├── ahu.glb
    ├── bed.glb
    ├── bedside.glb
    ├── callhost.glb
    ├── gas.glb
    ├── imaging.glb
    ├── monitor.glb
    └── rack.glb
```

执行逻辑：

1. 若 `SystemModel` 或 `Scene` 非空且未传 `--force`，直接退出并提示。
2. 创建分类：`房间`、`设备`（按 name 幂等）。
3. 逐个 GLB 计算 sha256，写入或复用 `AssetFile`。
4. 将 `catalog.json` 的 10 个条目映射为 `SystemModel`：
   - 房间条目：`width/depth` 取 `footprint`，`height` 取 `height`，`render`、`defaultKind` 等写入 configJson。
   - 设备条目：`url` 映射到对应 `AssetFile`，其余扩展字段写入 configJson，`deviceKind` 取原 `kind`。
   - 以 `key` 做存在性判断；`--force` 时按 `key` upsert，不删除其他记录。
5. 导入 `hospital-ward.json` 为场景，名称 `住院病区示例`；`--force` 时按名称 upsert。
6. 输出统计：分类数、模型数、文件数、场景数。

## 9. 测试计划

使用 vitest，临时 SQLite 文件 + `app.inject`，测试结束后删除临时库。

### 单元测试

- 房间 configJson：合法样例通过；非法 `bedLayout.count`、非法 `door.side` 返回字段路径。
- 设备 configJson：合法样例通过；缺少 `deviceKind`、非法 `initialStatus` 报错。
- 系统模型 → `ModelEntry` 映射：房间 footprint/height/render；设备 url/kind/偏移。
- 导入模型输出：`imported-<id>`、`source`、url。

### 集成测试

- 分类：创建、重名 409、更新、被引用时删除 409。
- 文件：上传小 GLB 成功；相同内容再次上传 `deduplicated: true` 且 id 相同；非 GLB 返回 400；下载内容与上传一致；被引用时删除 409。
- 系统模型：创建、按 key 查询、列表不含 configJson、详情含 config、更新、删除。
- 导入模型：创建（引用 fileId）、列表、删除。
- 场景：创建、列表元数据、详情返回对象、更新、删除。
- `GET /api/3d/model-library`：系统模型输出结构通过 3ddemo `ModelEntry` 形状断言（不依赖前端包，使用测试内类型断言）。

### 手工验收

- 启动服务后自动建表，`GET /api/3d/categories` 等返回 200。
- 运行 seed 后：2 个分类、10 个系统模型、8 个文件（至少）、1 个场景。
- `GET /api/3d/files/:id` 返回的 GLB 可被 three.js GLTFLoader 加载（后续前端联调验证）。

## 10. 风险与后续

- SQLite 体积随 BLOB 增长；通过 sha256 去重与 50MB 上限缓解，后续可迁移对象存储（只改 `AssetFile` 与下载路由）。
- 上传会占用 Node 内存；`@fastify/multipart` 限制单文件大小。
- 现有服务无鉴权、CORS 全开；本轮沿用，公网部署前需另立 spec。
- 场景 JSON 快照会随模型变多而增大；超过 8MB 时再调整 `bodyLimit` 或改为流式存储。
- 下一阶段 spec：3ddemo 接入 `/api/3d/model-library` 与场景接口、房间模板实例化 UI、导入模型上传与校准 UI。
