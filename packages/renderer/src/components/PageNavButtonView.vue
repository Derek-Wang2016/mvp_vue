<script setup lang="ts">
import type { CustomIconRecord } from '@mvp-vue/schema'
import {
  resolvePageNavButtonAppearance,
  resolvePageNavButtonBackgroundStyle,
  resolvePageNavIconColor,
  resolvePageNavIconDisplay,
  resolvePageNavIconGap,
  resolvePageNavIconPosition,
  resolvePageNavIconSize,
  pageNavContentFlexStyle,
} from '@mvp-vue/schema'
import { computed } from 'vue'
import PageNavButtonIcon from './PageNavButtonIcon.vue'

const props = withDefaults(defineProps<{
  label: string
  fontSize: number
  layoutProps: Record<string, unknown>
  savedIcons?: CustomIconRecord[]
  interactive?: boolean
  onClick?: () => void
}>(), {
  interactive: false,
  savedIcons: () => [],
})

const appearance = computed(() => resolvePageNavButtonAppearance(props.layoutProps))
const bgStyle = computed(() => resolvePageNavButtonBackgroundStyle(props.layoutProps))
const iconDisplay = computed(() => resolvePageNavIconDisplay(props.layoutProps))
const showIcon = computed(() => iconDisplay.value.kind !== 'none')
const iconSize = computed(() => resolvePageNavIconSize(props.layoutProps))
const iconGap = computed(() => resolvePageNavIconGap(props.layoutProps))
const iconPosition = computed(() => resolvePageNavIconPosition(props.layoutProps))
const iconColor = computed(() => resolvePageNavIconColor(props.layoutProps, appearance.value.textColor))
const contentFlexStyle = computed(() => pageNavContentFlexStyle(iconPosition.value, iconGap.value))

const baseStyle = computed(() => ({
  fontSize: props.fontSize + 'px',
  color: appearance.value.textColor,
  fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
  fontWeight: '500',
  letterSpacing: '0.02em',
  cursor: props.interactive ? 'pointer' : 'inherit',
  border: `1px solid ${appearance.value.borderColor}`,
  ...bgStyle.value,
  transition: props.interactive ? 'opacity 0.15s ease' : undefined,
}))

function onMouseEnter(e: MouseEvent) {
  if (!props.interactive) return
  const el = e.currentTarget as HTMLElement
  el.style.opacity = '0.92'
}

function onMouseLeave(e: MouseEvent) {
  if (!props.interactive) return
  const el = e.currentTarget as HTMLElement
  el.style.opacity = ''
}
</script>

<template>
  <component
    :is="interactive ? 'button' : 'div'"
    :type="interactive ? 'button' : undefined"
    :aria-hidden="interactive ? undefined : true"
    :class="[
      'w-full h-full flex items-center justify-center px-5 overflow-hidden rounded-xl select-none',
      interactive ? '' : 'pointer-events-none',
    ]"
    :style="baseStyle"
    @click="onClick"
    @mouseenter="onMouseEnter"
    @mouseleave="onMouseLeave"
  >
    <div class="min-w-0 max-w-full" :style="contentFlexStyle">
      <PageNavButtonIcon
        v-if="showIcon"
        :display="iconDisplay"
        :size="iconSize"
        :color="iconColor"
        :saved-icons="savedIcons"
      />
      <span class="truncate">{{ label }}</span>
    </div>
  </component>
</template>
