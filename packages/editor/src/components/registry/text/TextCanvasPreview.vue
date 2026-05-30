<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import type { CanvasPreviewProps } from '../types'

const props = defineProps<CanvasPreviewProps>()

const textareaRef = ref<HTMLTextAreaElement>()
const draft = ref((props.comp.props.content as string) ?? '')

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
    :style="{
      fontSize: ((comp.props.fontSize as number) ?? 20) + 'px',
      fontFamily: (comp.props.fontFamily as string) ?? 'sans-serif',
      fontWeight: (comp.props.fontWeight as string) ?? 'normal',
      color: (comp.props.color as string) ?? '#fff',
    }"
    @blur="handleSave"
    @keydown="handleKeydown"
  />
  <span
    v-else
    :style="{
      fontSize: ((comp.props.fontSize as number) ?? 20) + 'px',
      fontFamily: (comp.props.fontFamily as string) ?? 'sans-serif',
      fontWeight: (comp.props.fontWeight as string) ?? 'normal',
      color: (comp.props.color as string) ?? '#fff',
      cursor: 'text',
      userSelect: 'none',
    }"
    @dblclick.stop="onStartEdit?.()"
  >
    {{ comp.props.content as string }}
  </span>
</template>
