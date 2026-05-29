<script setup lang="ts">
import { computed, useAttrs } from 'vue'
import { parseColor } from './propertyPanel/shared'
import { useColorPicker } from '../composables/useColorPicker'

defineOptions({ inheritAttrs: false })

const props = defineProps<{
  value: string
  swatchClass?: string
  ariaLabel?: string
}>()

const emit = defineEmits<{
  change: [hex: string]
}>()

const attrs = useAttrs()
const { openColorPicker } = useColorPicker()

const pickerHex = computed(() => {
  const { r, g, b } = parseColor(props.value)
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
})

const rootClass = computed(() => [
  props.swatchClass ?? 'h-7 w-7 shrink-0',
  attrs.class,
])

function onSwatchClick() {
  openColorPicker(pickerHex.value, (hex) => emit('change', hex))
}
</script>

<template>
  <button
    type="button"
    :aria-label="ariaLabel ?? '选择颜色'"
    :class="rootClass"
    class="relative z-[2] block cursor-pointer overflow-hidden rounded border border-white/10 p-0 box-border pointer-events-auto"
    :style="{ backgroundColor: pickerHex }"
    @click.stop="onSwatchClick"
  />
</template>
