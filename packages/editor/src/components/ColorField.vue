<script setup lang="ts">
import { computed } from 'vue'
import ColorSwatch from './ColorSwatch.vue'
import { PROP_LABEL, PROP_HINT, parseColor, toRgba } from './propertyPanel/shared'

const props = defineProps<{
  label: string
  value: string
}>()

const emit = defineEmits<{
  change: [v: string]
}>()

const parsed = computed(() => parseColor(props.value))
const hex = computed(() =>
  '#' + [parsed.value.r, parsed.value.g, parsed.value.b]
    .map((n) => n.toString(16).padStart(2, '0'))
    .join('')
)
const pct = computed(() => Math.round(parsed.value.a * 100))

function onSwatchChange(picked: string) {
  const c = parseColor(picked)
  emit('change', toRgba(c.r, c.g, c.b, parsed.value.a))
}

function onOpacityChange(e: Event) {
  const v = Number((e.target as HTMLInputElement).value) / 100
  emit('change', toRgba(parsed.value.r, parsed.value.g, parsed.value.b, v))
}
</script>

<template>
  <label class="block">
    <span :class="PROP_LABEL">{{ label }}</span>
    <div class="flex items-center gap-2 mt-1">
      <ColorSwatch
        :value="hex"
        class="w-7 h-7 shrink-0"
        @change="onSwatchChange"
      />
      <input
        type="range"
        min="0"
        max="100"
        class="flex-1 min-w-0 accent-indigo-500 h-1"
        :value="pct"
        @input="onOpacityChange"
      />
      <span :class="[PROP_HINT, 'font-mono w-8 text-right tabular-nums']">{{ pct }}%</span>
    </div>
  </label>
</template>
