<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { PageComponent } from '@mvp-vue/schema'

const props = defineProps<{ comp: PageComponent }>()

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

function formatDatetime(format: string, date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return format
    .replace('YYYY', String(date.getFullYear()))
    .replace('MM', pad(date.getMonth() + 1))
    .replace('DD', pad(date.getDate()))
    .replace('dddd', WEEKDAY_NAMES[date.getDay()]!)
    .replace('HH', pad(date.getHours()))
    .replace('mm', pad(date.getMinutes()))
    .replace('ss', pad(date.getSeconds()))
}

const fmt = computed(() => (props.comp.props.format as string) || 'YYYY年MM月DD日 HH:mm')
const now = ref(new Date())
let timer: ReturnType<typeof setInterval>

onMounted(() => { timer = setInterval(() => now.value = new Date(), 1000) })
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div
    class="w-full h-full flex items-center justify-center select-none"
    :style="{
      fontSize: ((comp.props.fontSize as number) ?? 20) + 'px',
      fontFamily: (comp.props.fontFamily as string) ?? 'sans-serif',
      color: (comp.props.color as string) ?? '#ffffff',
      fontVariantNumeric: 'tabular-nums',
    }"
  >
    {{ formatDatetime(fmt, now) }}
  </div>
</template>
