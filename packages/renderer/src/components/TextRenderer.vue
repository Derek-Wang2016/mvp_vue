<script setup lang="ts">
import { computed } from 'vue'
import type { PageComponent } from '@mvp-vue/schema'
import { useData } from '../composables/useData'

const props = defineProps<{ comp: PageComponent }>()

const { data } = useData(props.comp.dataSourceId)

const displayContent = computed(() => {
  const content = (props.comp.props.content as string) ?? ''

  const raw = data.value
  if (raw && Array.isArray(raw) && raw.length > 0) {
    const maxRows = (props.comp.props.maxRows as number) ?? 1
    const textField = props.comp.props.textField as string | undefined
    const rows: string[] = []

    for (let i = 0; i < Math.min(raw.length, maxRows); i++) {
      const item = raw[i]
      if (typeof item === 'object' && item !== null) {
        const obj = item as Record<string, unknown>
        if (textField && textField in obj) {
          rows.push(String(obj[textField] ?? ''))
        } else {
          const vals = Object.values(obj)
          rows.push(String(vals[0] ?? ''))
        }
      } else {
        rows.push(String(item))
      }
    }
    const rawSep = (props.comp.props.separator as string) ?? ' '
    const sep = (() => { try { return JSON.parse(`"${rawSep}"`) } catch { return rawSep } })()
    return rows.join(sep)
  }

  return content
})
</script>

<template>
  <span
    :style="{
      fontSize: ((comp.props.fontSize as number) ?? 20) + 'px',
      fontFamily: (comp.props.fontFamily as string) ?? 'sans-serif',
      fontWeight: (comp.props.fontWeight as string) ?? 'normal',
      color: (comp.props.color as string) ?? '#fff',
      whiteSpace: 'pre-wrap',
    }"
  >{{ displayContent }}</span>
</template>
