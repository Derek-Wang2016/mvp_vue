import { z } from 'zod'

export const vec3Schema = z.tuple([z.number().finite(), z.number().finite(), z.number().finite()])
export const vec2Schema = z.tuple([
  z.number().positive().finite(),
  z.number().positive().finite(),
])
export const statusSchema = z.enum(['normal', 'warning', 'alarm', 'standby', 'calling', 'emergency'])
export const deviceKindSchema = z.enum(['rack', 'ahu', 'imaging', 'monitor', 'gas', 'bed', 'bedside', 'callhost'])
export const roomRenderSchema = z.enum(['glb', 'floor', 'shell'])
export const roomKindSchema = z.enum(['room', 'corridor'])
export const sideSchema = z.enum(['front', 'back', 'left', 'right'])
export const edgeOriginSchema = z.enum(['left', 'right'])
export const doorTypeSchema = z.enum(['single', 'double'])
export const bathroomCornerSchema = z.enum(['front-left', 'front-right', 'back-left', 'back-right'])

const metricSchema = z.object({
  label: z.string().min(1),
  value: z.string(),
})

const tagsSchema = z.array(z.string().trim().min(1).max(40)).max(20).optional()

const stateValueSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  color: z.string().min(1),
  opacity: z.number().min(0).max(1).finite().optional(),
})

const stateDefinitionSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  defaultValue: z.string().min(1),
  targets: z.array(z.string().min(1)).optional(),
  values: z.array(stateValueSchema).min(1),
})

const screenSchema = z.object({
  renderer: z.enum(['bedside', 'callhost']),
  position: vec3Schema,
  size: vec2Schema,
})

const statusStripSchema = z.object({
  position: vec3Schema,
  size: vec2Schema,
})

function ensureSerializable<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((value, ctx) => {
    try {
      JSON.stringify(value)
    } catch {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: '配置结构过深，无法序列化' })
    }
  })
}

export const roomConfigSchema = ensureSerializable(
  z
    .object({
      render: roomRenderSchema.default('shell'),
      defaultKind: roomKindSchema.default('room'),
      walls: z
        .object({
          front: z.boolean(),
          back: z.boolean(),
          left: z.boolean(),
          right: z.boolean(),
        })
        .partial()
        .optional(),
      door: z
        .object({
          side: sideSchema,
          type: doorTypeSchema.default('single'),
          margin: z.number().nonnegative().finite().optional(),
          from: edgeOriginSchema.optional(),
          open: z.boolean().optional(),
        })
        .optional(),
      windows: z
        .object({
          side: sideSchema.optional(),
          width: z.number().positive().finite().optional(),
          count: z.number().int().positive().optional(),
          from: edgeOriginSchema.optional(),
          margin: z.number().nonnegative().finite().optional(),
        })
        .optional(),
      bathroomCorner: bathroomCornerSchema.nullable().optional(),
      bedLayout: z
        .object({
          count: z.number().int().min(1).max(10),
          placement: z.enum(['both-sides', 'left', 'right']).default('both-sides'),
          gap: z.number().positive().finite().optional(),
          aisle: z.number().positive().finite().optional(),
        })
        .optional(),
      wallColor: z.string().min(1).optional(),
      floorColor: z.string().min(1).optional(),
      doorColor: z.string().min(1).optional(),
      showName: z.boolean().optional(),
      tags: tagsSchema,
    })
    .passthrough(),
)

export const deviceConfigSchema = ensureSerializable(
  z
    .object({
      deviceKind: deviceKindSchema,
      tagPrefix: z.string().min(1).max(16),
      initialStatus: statusSchema.default('normal'),
      metrics: z.array(metricSchema).default([]),
      labelOffset: vec3Schema.optional(),
      lampOffset: vec3Schema.optional(),
      screen: screenSchema.optional(),
      statusStrip: statusStripSchema.optional(),
      states: z.array(stateDefinitionSchema).optional(),
      footprint: vec2Schema.optional(),
      castShadow: z.boolean().optional(),
      receiveShadow: z.boolean().optional(),
      tags: tagsSchema,
    })
    .passthrough(),
)

export const importedConfigSchema = ensureSerializable(
  z
    .object({
      scale: z.number().positive().finite().optional(),
      rotationY: z.number().finite().optional(),
      offset: vec3Schema.optional(),
      castShadow: z.boolean().optional(),
      receiveShadow: z.boolean().optional(),
      labelOffset: vec3Schema.optional(),
      tags: tagsSchema,
    })
    .passthrough(),
)

export const categoryInputSchema = z.object({
  name: z.string().trim().min(1).max(40),
  sortOrder: z.number().int().min(-2147483648).max(2147483647).optional(),
})

const systemModelBaseShape = {
  key: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9-]*$/, 'key 只能包含小写字母、数字和连字符'),
  name: z.string().trim().min(1).max(80),
  categoryId: z.number().int().positive().max(2147483647).nullable().optional(),
  width: z.number().positive().finite().nullable().optional(),
  depth: z.number().positive().finite().nullable().optional(),
  height: z.number().positive().finite().nullable().optional(),
  fileId: z.number().int().positive().max(2147483647).nullable().optional(),
  thumbnailFileId: z.number().int().positive().max(2147483647).nullable().optional(),
}

const roomSystemModelInputSchema = z.object({
  ...systemModelBaseShape,
  kind: z.literal('room'),
  width: z.number().positive('房间宽度必须为正数').finite(),
  depth: z.number().positive('房间深度必须为正数').finite(),
  height: z.number().positive('房间高度必须为正数').finite(),
  config: roomConfigSchema.default({}),
})

const deviceSystemModelInputSchema = z.object({
  ...systemModelBaseShape,
  kind: z.literal('device'),
  fileId: z.number().int().positive('设备模型必须提供 fileId').max(2147483647),
  config: deviceConfigSchema,
})

export const systemModelInputSchema = z.discriminatedUnion('kind', [
  roomSystemModelInputSchema,
  deviceSystemModelInputSchema,
])

export type SystemModelInput = z.infer<typeof systemModelInputSchema>

export const importedModelInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  categoryId: z.number().int().positive().max(2147483647).nullable().optional(),
  fileId: z.number().int().positive().max(2147483647),
  thumbnailFileId: z.number().int().positive().max(2147483647).nullable().optional(),
  width: z.number().positive().finite().nullable().optional(),
  depth: z.number().positive().finite().nullable().optional(),
  height: z.number().positive().finite().nullable().optional(),
  config: importedConfigSchema.default({}),
})

export type ImportedModelInput = z.infer<typeof importedModelInputSchema>
export const deviceModelInputSchema = importedModelInputSchema
export type DeviceModelInput = z.infer<typeof deviceModelInputSchema>

export const sceneMetaSchema = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  thumbnailFileId: z.number().int().positive().max(2147483647).nullable().optional(),
})

const sceneDocumentShape = z
  .object({
    version: z.number().finite(),
    rooms: z.array(z.unknown()),
    nodes: z.array(z.unknown()),
    modelLibrary: z.array(z.unknown()),
  })
  .passthrough()

export type SceneNormalizeResult =
  | { ok: true; value: string; scene: unknown }
  | { ok: false; error: string; field: string }

export function normalizeSceneJson(input: unknown): SceneNormalizeResult {
  let candidate = input
  if (typeof input === 'string') {
    try {
      candidate = JSON.parse(input)
    } catch {
      return { ok: false, error: 'sceneJson 不是合法 JSON', field: 'sceneJson' }
    }
  }
  let value: string
  try {
    value = JSON.stringify(candidate)
  } catch {
    return { ok: false, error: 'sceneJson 结构过深，无法序列化', field: 'sceneJson' }
  }
  let parsed: ReturnType<typeof sceneDocumentShape.safeParse>
  try {
    parsed = sceneDocumentShape.safeParse(candidate)
  } catch {
    return { ok: false, error: 'sceneJson 结构过深，无法序列化', field: 'sceneJson' }
  }
  if (!parsed.success) {
    const issue = parsed.error.issues[0]
    const path = issue?.path.join('.')
    return {
      ok: false,
      error: issue?.message ?? 'sceneJson 结构不合法',
      field: path ? `sceneJson.${path}` : 'sceneJson',
    }
  }
  return { ok: true, value, scene: candidate }
}

export function zodError(error: z.ZodError): { message: string; field?: string } {
  const issue = error.issues[0]
  const field = issue?.path.length ? issue.path.join('.') : undefined
  return { message: issue?.message ?? '参数校验失败', field }
}
