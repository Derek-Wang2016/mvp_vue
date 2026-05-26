<script setup lang="ts">
import { ref, shallowRef, onMounted, onBeforeUnmount, watch } from 'vue'
import * as echarts from 'echarts'
import { DEFAULT_CHART_TEXT_FONT_SIZE, DEFAULT_CHART_TEXT_COLOR, buildPieSeriesLayout } from '@mvp-vue/schema'

const props = defineProps<{
  type: 'bar' | 'line' | 'pie'
  title?: string
  color?: string
  textFontSize?: number
  textColor?: string
  width: number
  height: number
}>()

function chartText(fontSize?: number, color?: string) {
  return {
    fontSize: fontSize ?? DEFAULT_CHART_TEXT_FONT_SIZE,
    color: color ?? DEFAULT_CHART_TEXT_COLOR,
  }
}

const containerRef = ref<HTMLDivElement>()
const instance = shallowRef<echarts.ECharts>()

onMounted(() => {
  const el = containerRef.value
  if (!el) return

  const inst = echarts.init(el)
  instance.value = inst

  const parent = el.parentElement ?? el
  const applySize = () => {
    const w = parent.clientWidth
    const h = parent.clientHeight
    if (w > 0 && h > 0) inst.resize({ width: w, height: h })
  }
  applySize()

  const observer = new ResizeObserver(applySize)
  observer.observe(parent)

  onBeforeUnmount(() => {
    observer.disconnect()
    inst.dispose()
  })

  renderChart()
})

function renderChart() {
  const inst = instance.value
  if (!inst || props.width <= 0 || props.height <= 0) return

  const text = chartText(props.textFontSize, props.textColor)

  if (props.type === 'bar') {
    inst.setOption({
      title: { text: props.title ?? '柱状图', left: 'center', textStyle: { ...text, fontWeight: 400 } },
      grid: { top: 30, right: 20, bottom: 24, left: 48 },
      xAxis: { type: 'category', data: ['A', 'B', 'C', 'D', 'E'], axisLabel: text },
      yAxis: { type: 'value', axisLabel: text, splitLine: { lineStyle: { color: '#334155' } } },
      series: [{ type: 'bar', data: [120, 200, 150, 80, 170], itemStyle: { color: props.color || '#818cf8', borderRadius: [3, 3, 0, 0] } }],
    })
  } else if (props.type === 'line') {
    inst.setOption({
      title: { text: props.title ?? '折线图', left: 'center', textStyle: { ...text, fontWeight: 400 } },
      grid: { top: 30, right: 20, bottom: 24, left: 48 },
      xAxis: { type: 'category', data: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], axisLabel: text },
      yAxis: { type: 'value', axisLabel: text, splitLine: { lineStyle: { color: '#334155' } } },
      series: [{
        type: 'line', data: [820, 932, 901, 934, 1290], smooth: true,
        lineStyle: { color: '#34d399', width: 2 }, itemStyle: { color: '#34d399' },
        symbol: 'circle', symbolSize: 4,
      }],
    })
  } else {
    const fs = props.textFontSize ?? DEFAULT_CHART_TEXT_FONT_SIZE
    const pieLayout = buildPieSeriesLayout(props.width, props.height, fs, Boolean(props.title))
    const color = props.textColor ?? DEFAULT_CHART_TEXT_COLOR
    inst.setOption({
      title: { text: props.title ?? '饼图', left: 'center', textStyle: { ...text, fontWeight: 400 } },
      series: [{
        type: 'pie', radius: pieLayout.radius, center: pieLayout.center,
        avoidLabelOverlap: true,
        label: { color, fontSize: fs, overflow: 'truncate', width: pieLayout.labelMaxWidth },
        labelLine: { ...pieLayout.labelLine, lineStyle: { color } },
        data: [
          { value: 335, name: 'A', itemStyle: { color: '#818cf8' } },
          { value: 310, name: 'B', itemStyle: { color: '#34d399' } },
          { value: 234, name: 'C', itemStyle: { color: '#f472b6' } },
          { value: 135, name: 'D', itemStyle: { color: '#fbbf24' } },
        ],
      }],
    })
  }

  if (props.width > 0 && props.height > 0) inst.resize({ width: props.width, height: props.height })
}

watch(() => [props.title, props.color, props.textFontSize, props.textColor, props.width, props.height], renderChart)
</script>

<template>
  <div ref="containerRef" class="w-full h-full" style="min-width: 0; min-height: 0" />
</template>
