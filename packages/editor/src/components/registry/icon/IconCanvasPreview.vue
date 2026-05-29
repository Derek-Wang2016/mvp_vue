<script setup lang="ts">
import { computed } from 'vue'
import { iconPropsToDictEntry, resolveIconLayoutSizes } from '@mvp-vue/schema'
import { useEditorStore } from '../../../stores/editorStore'
import { storeToRefs } from 'pinia'
import IconDictEntryPreview from '../../IconDictEntryPreview.vue'
import type { CanvasPreviewProps } from '../types'

const props = defineProps<CanvasPreviewProps>()

const store = useEditorStore()
const { savedIcons } = storeToRefs(store)

const iconEntry = computed(() => iconPropsToDictEntry(props.comp.props))

const layout = computed(() =>
  resolveIconLayoutSizes(props.comp.w, props.comp.h, props.comp.props),
)
const iconSize = computed(() => layout.value.iconSizePx)
const color = computed(() => (props.comp.props.color as string) ?? '#cbd5e1')
const caption = computed(() => String(props.comp.props.caption ?? '').trim())
const captionFontSize = computed(() => layout.value.captionFontSizePx)
const captionColor = computed(() => {
  const c = String(props.comp.props.captionColor ?? '').trim()
  return c || color.value
})
const opacity = computed(() => (props.comp.props.opacity as number) ?? 1)

const flexAlign = computed(() => {
  const a = (props.comp.props.align as string) ?? 'center'
  if (a === 'left') return 'flex-start'
  if (a === 'right') return 'flex-end'
  return 'center'
})

const flexJustify = computed(() => {
  const v = (props.comp.props.valign as string) ?? 'center'
  if (v === 'top') return 'flex-start'
  if (v === 'bottom') return 'flex-end'
  return 'center'
})
</script>

<template>
  <div
    class="w-full h-full flex flex-col gap-1 px-1 box-border overflow-hidden select-none"
    :style="{
      alignItems: flexAlign,
      justifyContent: flexJustify,
      opacity: opacity,
    }"
  >
    <IconDictEntryPreview :entry="iconEntry" :saved-icons="savedIcons" :size="iconSize" :color="color" />
    <span
      v-if="caption"
      class="max-w-full truncate text-center leading-tight"
      :style="{
        fontFamily: (comp.props.fontFamily as string) ?? 'sans-serif',
        fontSize: `${captionFontSize}px`,
        color: captionColor,
      }"
    >{{ caption }}</span>
  </div>
</template>
