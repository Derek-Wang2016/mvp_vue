<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import type { PageComponent } from '@mvp-vue/schema'

const props = defineProps<{ comp: PageComponent }>()

const THEMES: Record<string, {
  face: string; tick: string; number: string
  hour: string; minute: string; second: string; center: string
}> = {
  dark:       { face: '#0f172a', tick: '#64748b', number: '#e2e8f0', hour: '#f1f5f9', minute: '#cbd5e1', second: '#f59e0b', center: '#e2e8f0' },
  light:      { face: '#f8fafc', tick: '#94a3b8', number: '#1e293b', hour: '#0f172a', minute: '#334155', second: '#ef4444', center: '#0f172a' },
  'tech-blue':{ face: '#0b1121', tick: '#1e40af', number: '#60a5fa', hour: '#bfdbfe', minute: '#60a5fa', second: '#f59e0b', center: '#93c5fd' },
}

const theme = computed(() => (props.comp.props.theme as string) || 'dark')
const showSeconds = computed(() => props.comp.props.showSeconds !== false)
const brandName = computed(() => (props.comp.props.brandName as string) || '飞星科技')
const colors = computed(() => THEMES[theme.value] || THEMES.dark)
const diameter = computed(() => Math.min(props.comp.w, props.comp.h))

const now = ref(new Date())
let timer: ReturnType<typeof setInterval>
onMounted(() => { timer = setInterval(() => now.value = new Date(), 1000) })
onBeforeUnmount(() => clearInterval(timer))

const hourAngle = computed(() => {
  const h = now.value.getHours()
  const m = now.value.getMinutes()
  return (h % 12) * 30 + m * 0.5
})
const minuteAngle = computed(() => now.value.getMinutes() * 6 + now.value.getSeconds() * 0.1)
const secondAngle = computed(() => now.value.getSeconds() * 6)

function calcTickEndpoints(i: number, isHour: boolean) {
  const angle = (i * 6 - 90) * (Math.PI / 180)
  const inner = isHour ? 78 : 83
  const outer = 92
  return {
    x1: 100 + inner * Math.cos(angle),
    y1: 100 + inner * Math.sin(angle),
    x2: 100 + outer * Math.cos(angle),
    y2: 100 + outer * Math.sin(angle),
  }
}

function calcNumberPos(n: number) {
  const angle = ((n / 3 - 1) * 90) * (Math.PI / 180)
  const radius = 68
  return { x: 100 + radius * Math.cos(angle), y: 100 + radius * Math.sin(angle) }
}

const tickMarkers = computed(() =>
  Array.from({ length: 60 }, (_, i) => ({
    ...calcTickEndpoints(i, i % 5 === 0),
    isHour: i % 5 === 0,
  }))
)

const numbers = computed(() =>
  [12, 3, 6, 9].map((n) => ({ n, ...calcNumberPos(n) }))
)
</script>

<template>
  <div class="w-full h-full flex items-center justify-center select-none">
    <svg viewBox="0 0 200 200" :width="diameter" :height="diameter">
      <circle cx="100" cy="100" r="95" :fill="colors.face" />
      <line
        v-for="(t, i) in tickMarkers" :key="i"
        :x1="t.x1" :y1="t.y1" :x2="t.x2" :y2="t.y2"
        :stroke="colors.tick" :stroke-width="t.isHour ? 2 : 1"
      />
      <text
        v-for="n in numbers" :key="n.n"
        :x="n.x" :y="n.y" text-anchor="middle" dominant-baseline="central"
        :fill="colors.number" font-size="18" font-family="sans-serif"
      >{{ n.n }}</text>
      <line x1="100" y1="100" x2="100" y2="55" :stroke="colors.hour"
        stroke-width="3.5" stroke-linecap="round"
        :transform="`rotate(${hourAngle}, 100, 100)`" />
      <line x1="100" y1="100" x2="100" y2="35" :stroke="colors.minute"
        stroke-width="2" stroke-linecap="round"
        :transform="`rotate(${minuteAngle}, 100, 100)`" />
      <line v-if="showSeconds" x1="100" y1="100" x2="100" y2="30" :stroke="colors.second"
        stroke-width="1" stroke-linecap="round"
        :transform="`rotate(${secondAngle}, 100, 100)`" />
      <circle cx="100" cy="100" r="5" :fill="colors.center" />
      <circle cx="100" cy="100" r="2.5" :fill="colors.face" />
      <text v-if="brandName"
        x="100" y="132" text-anchor="middle" dominant-baseline="central"
        :fill="colors.number" font-size="11" font-family="sans-serif" opacity="0.85"
      >{{ brandName }}</text>
    </svg>
  </div>
</template>
