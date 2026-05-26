<script setup lang="ts">
import { ref, onBeforeUnmount } from 'vue'
import type { PageComponent } from '@mvp-vue/schema'

const props = defineProps<{ comp: PageComponent }>()

const WEEKDAY_NAMES = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']

const format = (props.comp.props.format as string) ?? 'YYYY年MM月DD日 HH:mm'
const fontSize = (props.comp.props.fontSize as number) ?? 20
const fontFamily = (props.comp.props.fontFamily as string) ?? 'sans-serif'
const color = (props.comp.props.color as string) ?? '#ffffff'

const now = ref(new Date())
const timer = setInterval(() => { now.value = new Date() }, 1000)
onBeforeUnmount(() => clearInterval(timer))

const pad = (n: number) => String(n).padStart(2, '0')

function formatted(): string {
  return format
    .replace('YYYY', String(now.value.getFullYear()))
    .replace('MM', pad(now.value.getMonth() + 1))
    .replace('DD', pad(now.value.getDate()))
    .replace('dddd', WEEKDAY_NAMES[now.value.getDay()] ?? '')
    .replace('HH', pad(now.value.getHours()))
    .replace('mm', pad(now.value.getMinutes()))
    .replace('ss', pad(now.value.getSeconds()))
}
</script>

<template>
  <div
    class="w-full h-full flex items-center justify-center select-none"
    :style="{ fontSize: fontSize + 'px', fontFamily, color, fontVariantNumeric: 'tabular-nums' }"
  >
    {{ formatted() }}
  </div>
</template>
