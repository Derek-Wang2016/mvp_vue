import type { ComponentType, PageComponent, DataSource } from '@mvp-vue/schema'
import type { Component } from 'vue'

export interface ComponentPropertyFieldsProps {
  comp: PageComponent
  updateProps: (patch: Record<string, unknown>) => void
}

export interface ComponentDataFieldsProps extends ComponentPropertyFieldsProps {
  dataSourceId: string | undefined
  dataSources: { id: string; type: string }[]
}

export interface CanvasPreviewProps {
  comp: PageComponent
  updateProps?: (patch: Record<string, unknown>) => void
  isEditing?: boolean
  onStartEdit?: () => void
  onEndEdit?: () => void
}

export interface EditorComponentDef {
  defaultProps: () => Record<string, unknown>
  defaultSize: () => { w: number; h: number }
  PropertyFields: Component
  CanvasPreview: Component
  DataFields?: Component
}

export type EditorRegistry = Partial<Record<ComponentType, EditorComponentDef>>
