<script setup lang="ts">
import { computed } from 'vue'
import type { PageNavIconPreset, PageNavButtonColors } from '@mvp-vue/schema'
import { DEFAULT_PAGE_NAV_BUTTON_COLORS } from '@mvp-vue/schema'

const props = withDefaults(defineProps<{
  label: string
  fontSize: number
  iconPreset: PageNavIconPreset
  iconUrl?: string
  colors?: Partial<PageNavButtonColors>
  interactive?: boolean
}>(), {
  iconUrl: '',
  interactive: false,
})

const emit = defineEmits<{
  click: []
}>()

const PRESET_SET = new Set<string>(['arrow-right', 'home', 'layout-grid', 'bar-chart', 'external-link', 'none'])

function isImageUrl(value: string) {
  return /^(https?:|data:|\/)/i.test(value.trim())
}

function parseRgb(color: string | undefined | null): { r: number; g: number; b: number } | null {
  if (color == null || typeof color !== 'string') return null
  const trimmed = color.trim()
  if (!trimmed) return null
  const rgba = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
  if (rgba) return { r: +rgba[1]!, g: +rgba[2]!, b: +rgba[3]! }
  const hex6 = trimmed.match(/^#([0-9a-f]{6})$/i)
  if (hex6) return {
    r: parseInt(hex6[1]!.slice(0, 2), 16),
    g: parseInt(hex6[1]!.slice(2, 4), 16),
    b: parseInt(hex6[1]!.slice(4, 6), 16),
  }
  const hex3 = trimmed.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i)
  if (hex3) return {
    r: parseInt(hex3[1]! + hex3[1], 16),
    g: parseInt(hex3[2]! + hex3[2], 16),
    b: parseInt(hex3[3]! + hex3[3], 16),
  }
  return null
}

function withAlpha(color: string, alpha: number): string {
  const rgb = parseRgb(color)
  if (!rgb) return color
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`
}

function resolveColors(colors?: Partial<PageNavButtonColors>): PageNavButtonColors {
  const resolved = { ...DEFAULT_PAGE_NAV_BUTTON_COLORS }
  if (!colors) return resolved
  const keys: (keyof PageNavButtonColors)[] = ['textColor', 'borderColor', 'bgColorFrom', 'bgColorTo', 'glowColor']
  for (const key of keys) {
    const v = colors[key]
    if (typeof v === 'string' && v.trim()) resolved[key] = v
  }
  return resolved
}

const resolvedColors = computed(() => resolveColors(props.colors))
const customUrl = computed(() => props.iconUrl?.trim() ?? '')
const showCustomIcon = computed(() => customUrl.value.length > 0 && isImageUrl(customUrl.value))
const preset = computed<PageNavIconPreset>(() =>
  showCustomIcon.value ? 'none' : (PRESET_SET.has(props.iconPreset) ? props.iconPreset : 'arrow-right')
)
const showPresetIcon = computed(() => !showCustomIcon.value && preset.value !== 'none')

const baseStyle = computed(() => ({
  fontSize: props.fontSize + 'px',
  color: resolvedColors.value.textColor,
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  fontWeight: 500,
  letterSpacing: '0.02em',
  cursor: props.interactive ? 'pointer' : 'inherit',
  border: `1px solid ${resolvedColors.value.borderColor}`,
  background: `linear-gradient(135deg, ${resolvedColors.value.bgColorFrom} 0%, ${resolvedColors.value.bgColorTo} 55%, ${resolvedColors.value.bgColorTo} 100%)`,
  boxShadow: `0 0 0 1px rgba(255,255,255,0.06) inset, 0 8px 32px ${resolvedColors.value.glowColor}, 0 2px 8px rgba(0,0,0,0.35)`,
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)',
}))
</script>

<template>
  <component
    :is="interactive ? 'button' : 'div'"
    :type="interactive ? 'button' : undefined"
    class="group relative w-full h-full flex items-center justify-center gap-2.5 px-5 overflow-hidden rounded-xl select-none"
    :class="{ 'pointer-events-none': !interactive }"
    :style="baseStyle"
    @click="interactive ? emit('click') : undefined"
  >
    <span
      class="pointer-events-none absolute inset-0 opacity-60"
      aria-hidden="true"
      :style="{
        background: `linear-gradient(105deg, transparent 40%, ${withAlpha(resolvedColors.textColor, 0.15)} 50%, transparent 60%)`,
      }"
    />
    <img
      v-if="showCustomIcon"
      :src="customUrl"
      alt=""
      class="relative z-[1] w-5 h-5 object-contain shrink-0"
      draggable="false"
    />
    <span v-if="showPresetIcon" class="relative z-[1] flex shrink-0 items-center justify-center opacity-90">
      <!-- arrow-right -->
      <svg v-if="preset === 'arrow-right'" width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="resolvedColors.textColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12h14M13 6l6 6-6 6" />
      </svg>
      <!-- home -->
      <svg v-else-if="preset === 'home'" width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="resolvedColors.textColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />
      </svg>
      <!-- layout-grid -->
      <svg v-else-if="preset === 'layout-grid'" width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="resolvedColors.textColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
      <!-- bar-chart -->
      <svg v-else-if="preset === 'bar-chart'" width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="resolvedColors.textColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M4 20V10M10 20V4M16 20v-6M22 20V8" />
      </svg>
      <!-- external-link -->
      <svg v-else-if="preset === 'external-link'" width="20" height="20" viewBox="0 0 24 24" fill="none" :stroke="resolvedColors.textColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      </svg>
    </span>
    <span class="relative z-[1] truncate">{{ label }}</span>
  </component>
</template>
