<script setup lang="ts">
import { computed } from 'vue'
import { iconPropsToDictEntry, resolveIconLayoutSizes, type CustomIconRecord } from '@mvp-vue/schema'
import type { PageComponent } from '@mvp-vue/schema'
import CardListIcon from './CardListIcon.vue'

const props = defineProps<{
  comp: PageComponent
  savedIcons?: CustomIconRecord[]
}>()

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
    class="w-full h-full flex flex-col gap-1 px-1 box-border overflow-hidden"
    :style="{
      alignItems: flexAlign,
      justifyContent: flexJustify,
      opacity: opacity,
    }"
  >
    <CardListIcon
      :entry="iconEntry"
      :saved-icons="savedIcons"
      :size="`${iconSize}px`"
      :color="color"
    />
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
