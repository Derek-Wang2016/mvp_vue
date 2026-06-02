<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import * as echarts from 'echarts'
import type { PageComponent } from '@mvp-vue/schema'
import {
  DEFAULT_CHART_TEXT_FONT_SIZE,
  DEFAULT_CHART_TEXT_COLOR,
  buildPieSeriesLayout,
  filterChartArrayRows,
} from '@mvp-vue/schema'
import { useData } from '../composables/useData'

const props = defineProps<{ comp: PageComponent }>()

const chartRef = ref<HTMLDivElement | null>(null)
const instanceRef = shallowRef<echarts.ECharts | null>(null)

const { data, loading } = useData(props.comp.dataSourceId)

const FALLBACK_BAR = [120, 200, 150, 80, 170]
const FALLBACK_LINE = [820, 932, 901, 934, 1290]
const FALLBACK_PIE = [
  { value: 335, name: 'A', itemStyle: { color: '#818cf8' } },
  { value: 310, name: 'B', itemStyle: { color: '#34d399' } },
  { value: 234, name: 'C', itemStyle: { color: '#f472b6' } },
  { value: 135, name: 'D', itemStyle: { color: '#fbbf24' } },
]
const FALLBACK_CAT = ['A', 'B', 'C', 'D', 'E']

const CATEGORY_KEYS = ['KEY', 'key', 'x', 'name', 'label', 'title', 'symbol', 'id']
const VALUE_KEYS = ['VALUE', 'value', 'y', 'current_price', 'market_cap', 'total_volume', 'price', 'revenue', 'orders', 'amount', 'count']

function pickKey(obj: Record<string, unknown>, preferred: string | undefined, fallbacks: string[]): string | undefined {
  if (preferred && preferred in obj) return preferred
  for (const k of fallbacks) {
    if (k in obj) return k
  }
  return undefined
}

function mapChartData(raw: unknown, compType: string, categoryField?: string, valueField?: string) {
  if (!raw) return null
  const arr = raw as unknown[]
  if (!Array.isArray(arr) || arr.length === 0) return null

  if (compType === 'pie-chart') {
    return arr.map((item, i) => {
      if (typeof item === 'object' && item !== null) {
        const row = item as Record<string, unknown>
        const vk = pickKey(row, valueField, VALUE_KEYS)
        const nk = pickKey(row, categoryField, CATEGORY_KEYS)
        return {
          value: vk ? Number(row[vk]) : Number(item),
          name: nk ? String(row[nk]) : String.fromCharCode(65 + i),
          itemStyle: { color: ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#fb923c'][i % 5] },
        }
      }
      return {
        value: Number(item),
        name: String.fromCharCode(65 + i),
        itemStyle: { color: ['#818cf8', '#34d399', '#f472b6', '#fbbf24', '#fb923c'][i % 5] },
      }
    })
  }

  if (compType === 'bar-chart' || compType === 'line-chart') {
    const categories: string[] = []
    const values: number[] = []
    arr.forEach((item, i) => {
      if (typeof item === 'object' && item !== null) {
        const row = item as Record<string, unknown>
        const ck = pickKey(row, categoryField, CATEGORY_KEYS)
        const vk = pickKey(row, valueField, VALUE_KEYS)
        categories.push(ck ? String(row[ck]) : String.fromCharCode(65 + i))
        values.push(vk ? Number(row[vk]) : 0)
      } else {
        categories.push(String.fromCharCode(65 + i))
        values.push(Number(item))
      }
    })
    return { categories, values }
  }

  return null
}

function buildOption(comp: PageComponent, data: unknown, loading: boolean): echarts.EChartsOption {
  const title = (comp.props.title as string) ?? ''
  const categoryField = comp.props.categoryField as string | undefined
  const valueField = comp.props.valueField as string | undefined
  const textFontSize = (comp.props.textFontSize as number) ?? DEFAULT_CHART_TEXT_FONT_SIZE
  const textColor = (comp.props.textColor as string) ?? DEFAULT_CHART_TEXT_COLOR
  const showValue = comp.props.showValue === true
  const showLegend = comp.props.showLegend === true
  const textStyle = { color: textColor, fontSize: textFontSize }
  const valueLabel = {
    show: showValue,
    color: textColor,
    fontSize: textFontSize,
  }
  const filtered = filterChartArrayRows(data, comp.props.filterField, comp.props.filterValues)
  const mapped = mapChartData(filtered, comp.type, categoryField, valueField)

  const option: echarts.EChartsOption = {
    title: {
      text: title,
      left: 'center',
      textStyle: { ...textStyle, fontWeight: 400 },
    },
    legend: {
      show: showLegend,
      bottom: 0,
      textStyle,
    },
    grid: { top: title ? 40 : 10, right: 20, bottom: showLegend ? 36 : 32, left: 48 },
  }

  if (comp.type === 'pie-chart') {
    const pieData = (mapped as { name: string; value: number }[]) ?? FALLBACK_PIE
    const pieLayout = buildPieSeriesLayout(comp.w, comp.h, textFontSize, Boolean(title))
    if (showLegend) {
      option.legend = { show: true, bottom: 0, textStyle, data: pieData.map((d) => d.name) }
    }
    option.series = [{
      type: 'pie',
      radius: pieLayout.radius,
      center: pieLayout.center,
      avoidLabelOverlap: true,
      label: {
        color: textColor,
        fontSize: textFontSize,
        overflow: 'truncate',
        width: pieLayout.labelMaxWidth,
        formatter: showValue ? '{b}: {c} ({d}%)' : '{b}',
      },
      labelLine: {
        ...pieLayout.labelLine,
        lineStyle: { color: textColor },
      },
      data: pieData,
    }]
  } else {
    const catData = mapped ? (mapped as { categories: string[] }).categories : FALLBACK_CAT
    const valData = mapped ? (mapped as { values: number[] }).values : (comp.type === 'bar-chart' ? FALLBACK_BAR : FALLBACK_LINE)
    const seriesName = title || '数据'
    if (showLegend) {
      option.legend = { show: true, bottom: 0, textStyle, data: [seriesName] }
    }
    option.xAxis = {
      type: 'category',
      data: catData,
      axisLabel: textStyle,
      axisLine: { lineStyle: { color: '#475569' } },
    }
    option.yAxis = {
      type: 'value',
      axisLabel: textStyle,
      splitLine: { lineStyle: { color: '#334155' } },
    }
    if (comp.type === 'bar-chart') {
      option.series = [{
        type: 'bar',
        name: seriesName,
        data: valData,
        itemStyle: { color: (comp.props.color as string) || '#818cf8', borderRadius: [4, 4, 0, 0] },
        label: { ...valueLabel, position: 'top' },
      }]
    } else {
      option.series = [{
        type: 'line',
        name: seriesName,
        data: valData,
        smooth: true,
        lineStyle: { color: '#34d399', width: 2 },
        itemStyle: { color: '#34d399' },
        symbol: 'circle',
        symbolSize: 6,
        label: { ...valueLabel, position: 'top' },
      }]
    }
  }

  option.backgroundColor = 'transparent'
  if (loading) {
    option.title = { text: '加载中...', left: 'center', top: 'center', textStyle: { color: '#64748b', fontSize: 12 } }
  }

  return option
}

function applyChartOption() {
  const instance = instanceRef.value
  if (!instance) return
  instance.setOption(buildOption(props.comp, data.value, loading.value), true)
}

onMounted(() => {
  if (!chartRef.value) return
  const instance = echarts.init(chartRef.value, undefined, {
    width: chartRef.value.clientWidth,
    height: chartRef.value.clientHeight,
  })
  instanceRef.value = instance
  applyChartOption()

  const resize = () => instance.resize()
  window.addEventListener('resize', resize)
  onBeforeUnmount(() => {
    window.removeEventListener('resize', resize)
    instance.dispose()
    instanceRef.value = null
  })
})

watch([data, loading, () => props.comp.props, () => props.comp.type, () => props.comp.w, () => props.comp.h], applyChartOption)

watch([() => props.comp.w, () => props.comp.h], () => {
  instanceRef.value?.resize()
})
</script>

<template>
  <div ref="chartRef" class="w-full h-full" />
</template>
