<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { buildTextComponentStyle } from '@mvp-vue/schema'
import { fetchEditableText } from '../../../editableTextApi'
import type { CanvasPreviewProps } from '../types'

const props = defineProps<CanvasPreviewProps>()
const content = ref('')
const missing = ref(false)

const shown = computed(() => {
  const sample = props.comp.props.sampleContent
  return typeof sample === 'string' ? sample : content.value
})

const textStyle = computed(() => {
  const style = buildTextComponentStyle(props.comp.props)
  const bg = (props.comp.props.backgroundColor as string) || 'transparent'
  return { ...style, backgroundColor: bg, overflow: 'hidden' }
})

async function load() {
  const key = String(props.comp.props.rowKey ?? '').trim()
  if (!key) {
    content.value = ''
    missing.value = false
    return
  }
  try {
    const row = await fetchEditableText(key)
    content.value = row?.content ?? ''
    missing.value = !row
  } catch {
    content.value = ''
    missing.value = true
  }
}

watch(() => props.comp.props.rowKey, () => { void load() }, { immediate: true })
</script>

<template>
  <div class="w-full h-full px-1" :style="textStyle">
    <span v-if="String(comp.props.rowKey ?? '').trim() && shown">{{ shown }}</span>
    <span v-else class="opacity-60">
      {{ String(comp.props.rowKey ?? '').trim() ? (missing ? '无此数据行' : '空内容') : '未配置 KEY' }}
    </span>
  </div>
</template>
