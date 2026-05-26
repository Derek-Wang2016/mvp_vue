<script setup lang="ts">
import { ref, watch, computed, onMounted, onBeforeUnmount, type CSSProperties } from 'vue'

const props = defineProps<{
  text: string
  className: string
  fieldStyle: CSSProperties
}>()

const viewportRef = ref<HTMLSpanElement | null>(null)
const innerRef = ref<HTMLSpanElement | null>(null)
const marqueeDistance = ref(0)

function pickFieldTextStyles(style: CSSProperties): Record<string, string> {
  const picked: Record<string, string> = {}
  const src = style as Record<string, string | undefined>
  for (const key of ['color', 'fontSize', 'fontWeight', 'fontFamily', 'lineHeight', 'letterSpacing']) {
    if (src[key]) picked[key] = src[key]
  }
  return picked
}

function measure() {
  const viewport = viewportRef.value
  const inner = innerRef.value
  if (!viewport || !inner) return
  marqueeDistance.value = Math.max(0, inner.scrollWidth - viewport.clientWidth)
}

let ro: ResizeObserver | null = null

onMounted(() => {
  measure()
  ro = new ResizeObserver(measure)
  if (viewportRef.value) ro.observe(viewportRef.value)
  if (innerRef.value) ro.observe(innerRef.value)
})

onBeforeUnmount(() => {
  ro?.disconnect()
})

watch(() => props.text, () => {
  requestAnimationFrame(measure)
})

const shouldMarquee = computed(() => marqueeDistance.value > 0)
const durationSec = computed(() => (shouldMarquee.value ? Math.max(4, marqueeDistance.value / 35) : 0))
const innerTextStyle = computed(() => pickFieldTextStyles(props.fieldStyle))

const viewportStyle = computed((): CSSProperties => ({
  ...props.fieldStyle,
  overflow: 'hidden',
  minWidth: props.fieldStyle.minWidth ?? '0',
  maxWidth: props.fieldStyle.maxWidth ?? '100%',
}))

const innerStyle = computed((): CSSProperties => {
  if (shouldMarquee.value) {
    return {
      ...innerTextStyle.value,
      '--marquee-distance': `${marqueeDistance.value}px`,
      animationDuration: `${durationSec.value}s`,
    } as CSSProperties
  }
  return {
    ...innerTextStyle.value,
    whiteSpace: 'nowrap',
    display: 'block',
    width: '100%',
    textAlign: props.fieldStyle.textAlign,
  }
})
</script>

<template>
  <span ref="viewportRef" :class="className" :style="viewportStyle">
    <span
      ref="innerRef"
      :class="shouldMarquee ? 'card-field-value-marquee-inner' : undefined"
      :style="innerStyle"
    >{{ text }}</span>
  </span>
</template>
