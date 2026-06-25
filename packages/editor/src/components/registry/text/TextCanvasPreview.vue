<script setup lang="ts">
import { ref, watch, nextTick, computed } from 'vue'
import { buildTextComponentStyle } from '@mvp-vue/schema'
import type { CanvasPreviewProps } from '../types'

const props = defineProps<CanvasPreviewProps>()

const textareaRef = ref<HTMLTextAreaElement>()
const draft = ref((props.comp.props.content as string) ?? '')

const textStyle = computed(() => {
  const extra: Record<string, string> = {}
  if (!props.isEditing) {
    extra.cursor = 'text'
    extra.userSelect = 'none'
  }
  return buildTextComponentStyle(props.comp.props, extra)
})

watch(() => props.comp.props.content, (val) => {
  draft.value = (val as string) ?? ''
})

watch(() => props.isEditing, async (editing) => {
  if (editing) {
    draft.value = (props.comp.props.content as string) ?? ''
    await nextTick()
    const el = textareaRef.value
    if (el) {
      el.focus()
      el.setSelectionRange(el.value.length, el.value.length)
    }
  }
})

function handleSave() {
  props.updateProps?.({ content: draft.value })
  props.onEndEdit?.()
}

function handleCancel() {
  draft.value = (props.comp.props.content as string) ?? ''
  props.onEndEdit?.()
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSave()
  }
  if (e.key === 'Escape') {
    e.preventDefault()
    handleCancel()
  }
}
</script>

<template>
  <textarea
    v-if="isEditing"
    ref="textareaRef"
    v-model="draft"
    class="w-full h-full resize-none bg-transparent border border-blue-400 rounded p-1 outline-none"
    :style="textStyle"
    @blur="handleSave"
    @keydown="handleKeydown"
  />
  <span
    v-else
    class="block w-full h-full"
    :style="textStyle"
    @dblclick.stop="onStartEdit?.()"
  >
    {{ comp.props.content as string }}
  </span>
</template>
