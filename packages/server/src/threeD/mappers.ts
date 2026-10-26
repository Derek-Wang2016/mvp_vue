import type { ImportedModel, ModelCategory, Scene, SystemModel } from '@prisma/client'
import type { z } from 'zod'
import { deviceConfigSchema, importedConfigSchema, roomConfigSchema } from './validation.js'

type SystemModelWithCategory = SystemModel & { category: ModelCategory | null }
type ImportedModelWithCategory = ImportedModel & { category: ModelCategory | null }
type SceneMetaRow = Pick<
  Scene,
  'id' | 'name' | 'description' | 'thumbnailFileId' | 'createdAt' | 'updatedAt'
>

export function fileUrl(id: number | null | undefined): string | null {
  return id == null ? null : `/api/3d/files/${id}`
}

function parseJson<T>(schema: z.ZodType<T>, raw: string): T {
  return schema.parse(JSON.parse(raw))
}

function parseJsonSafe<T>(schema: z.ZodType<T>, raw: string): T | null {
  try {
    const parsed = schema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : null
  } catch {
    return null
  }
}

export function formatCategory(row: ModelCategory) {
  return {
    id: row.id,
    name: row.name,
    sortOrder: row.sortOrder,
    updatedAt: row.updatedAt,
  }
}

export function formatSystemModel(row: SystemModelWithCategory) {
  return {
    id: row.id,
    key: row.key,
    name: row.name,
    kind: row.kind,
    category: row.category ? { id: row.category.id, name: row.category.name } : null,
    width: row.width,
    depth: row.depth,
    height: row.height,
    fileUrl: fileUrl(row.fileId),
    thumbnailFileId: row.thumbnailFileId,
    thumbnailUrl: fileUrl(row.thumbnailFileId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function formatSystemModelDetail(row: SystemModelWithCategory) {
  const config =
    row.kind === 'room'
      ? parseJson(roomConfigSchema, row.configJson)
      : parseJson(deviceConfigSchema, row.configJson)
  return { ...formatSystemModel(row), config }
}

export function formatImportedModel(row: ImportedModelWithCategory) {
  return {
    id: row.id,
    name: row.name,
    category: row.category ? { id: row.category.id, name: row.category.name } : null,
    fileId: row.fileId,
    fileUrl: fileUrl(row.fileId),
    thumbnailFileId: row.thumbnailFileId,
    thumbnailUrl: fileUrl(row.thumbnailFileId),
    width: row.width,
    depth: row.depth,
    height: row.height,
    config: parseJson(importedConfigSchema, row.configJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function formatSceneMeta(row: SceneMetaRow) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    thumbnailUrl: fileUrl(row.thumbnailFileId),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export function systemModelToLibraryEntry(
  row: SystemModel,
): { entry: Record<string, unknown> | null; skipped: boolean } {
  if (row.kind === 'room') {
    if (row.width == null || row.depth == null) {
      return { entry: null, skipped: true }
    }
    const config = parseJsonSafe(roomConfigSchema, row.configJson)
    if (!config) {
      return { entry: null, skipped: true }
    }
    const entry: Record<string, unknown> = {
      id: row.key,
      label: row.name,
      category: 'room',
      render: config.render,
      footprint: [row.width, row.depth],
      height: row.height ?? 2.8,
      defaultKind: config.defaultKind,
    }
    if (config.render === 'glb' && row.fileId != null) {
      entry.url = fileUrl(row.fileId)
    }
    return { entry, skipped: false }
  }

  if (row.fileId == null) {
    return { entry: null, skipped: true }
  }

  const config = parseJsonSafe(deviceConfigSchema, row.configJson)
  if (!config) {
    return { entry: null, skipped: true }
  }
  const entry: Record<string, unknown> = {
    id: row.key,
    label: row.name,
    category: 'device',
    url: fileUrl(row.fileId),
    kind: config.deviceKind,
    tagPrefix: config.tagPrefix,
    initialStatus: config.initialStatus,
    metrics: config.metrics,
    labelOffset: config.labelOffset ?? [0, 2, 0],
    lampOffset: config.lampOffset ?? [0, 1.5, 0],
  }
  if (config.screen) entry.screen = config.screen
  if (config.statusStrip) entry.statusStrip = config.statusStrip
  if (config.states) entry.states = config.states
  if (row.width != null && row.depth != null) entry.footprint = [row.width, row.depth]
  else if (config.footprint) entry.footprint = config.footprint

  return { entry, skipped: false }
}

export function importedModelToLibraryEntry(row: ImportedModel) {
  return {
    id: `imported-${row.id}`,
    label: row.name,
    category: 'device',
    source: 'imported',
    url: fileUrl(row.fileId),
    ...(row.width != null && row.depth != null ? { footprint: [row.width, row.depth] } : {}),
    config: parseJson(importedConfigSchema, row.configJson),
  }
}
