<script setup lang="ts">
import { computed } from 'vue'
import type { PageComponent } from '@mvp-vue/schema'
import { getEditorDef } from '../registry/registry'

const props = defineProps<{
  comp: PageComponent
  updateProps?: (patch: Record<string, unknown>) => void
  isEditing?: boolean
  onStartEdit?: () => void
  onEndEdit?: () => void
}>()

const def = computed(() => getEditorDef(props.comp.type))
</script>

<template>
  <component
    v-if="def"
    :is="def.CanvasPreview"
    :key="`${comp.id}-${comp.type}`"
    :comp="comp"
    :update-props="updateProps"
    :is-editing="isEditing"
    :on-start-edit="onStartEdit"
    :on-end-edit="onEndEdit"
  />
</template>
