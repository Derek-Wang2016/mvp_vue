<script setup lang="ts">
defineProps<{
  value: string
  swatchClass?: string
  ariaLabel?: string
}>()

const emit = defineEmits<{
  change: [hex: string]
}>()
</script>

<template>
  <label
    :aria-label="ariaLabel ?? '选择颜色'"
    :class="swatchClass ?? 'w-7 h-7 shrink-0'"
    class="relative block cursor-pointer overflow-hidden rounded box-border border border-white/10"
    :style="{ backgroundColor: value }"
  >
    <input
      type="color"
      class="editor-color-swatch"
      :value="value"
      @change="emit('change', ($event.target as HTMLInputElement).value)"
    />
  </label>
</template>
