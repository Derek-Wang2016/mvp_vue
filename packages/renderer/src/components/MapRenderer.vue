<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import * as echarts from 'echarts'
import type { PageComponent } from '@mvp-vue/schema'
import {
  DEFAULT_CHART_TEXT_FONT_SIZE,
  DEFAULT_CHART_TEXT_COLOR,
  resolveMapConfig,
  type MapDisplayMode,
} from '@mvp-vue/schema'
import { useData } from '../composables/useData'
import { ensureMapRegistered, type MapGeoJson } from './geo/ensureMapRegistered'
import { mapMapData, getFallbackMapData } from './mapData'
import { buildGeoCoordMap, toScatterData, scatterSymbolSize } from './mapGeoCoords'
import { resolveEchartsSymbol } from './mapSymbols'
import { resolveMapVisualParams } from './mapVisualStyle'

const props = defineProps<{ comp: PageComponent }>()

const chartRef = ref<HTMLDivElement | null>(null)
const instanceRef = shallowRef<echarts.ECharts | null>(null)
const { data, loading, error: dataError } = useData(props.comp.dataSourceId)

const mapConfig = computed(() => resolveMapConfig(props.comp.props))
const mapKey = ref<string | null>(null)
const geoJson = ref<MapGeoJson | null>(null)
const mapLoadError = ref<string | null>(null)

function resolveDisplayMode(props: Record<string, unknown>): MapDisplayMode {
  return props.mapDisplayMode === 'symbol' ? 'symbol' : 'fill'
}

function buildOption(
  comp: PageComponent,
  data: unknown,
  loading: boolean,
  mapKey: string,
  geoJson: MapGeoJson | null,
  mapLoadError: string | null,
  dataError: string | null,
): echarts.EChartsOption {
  const mapCfg = resolveMapConfig(comp.props)
  const displayMode = resolveDisplayMode(comp.props)
  const visual = resolveMapVisualParams(comp.props, displayMode)

  const title = (comp.props.title as string) ?? ''
  const nameField = comp.props.nameField as string | undefined
  const valueField = comp.props.valueField as string | undefined
  const textFontSize = (comp.props.textFontSize as number) ?? DEFAULT_CHART_TEXT_FONT_SIZE
  const textColor = (comp.props.textColor as string) ?? DEFAULT_CHART_TEXT_COLOR
  const showValueLabel = comp.props.showValueLabel !== false
  const showVisualMap = comp.props.showVisualMap === true
  const mapSymbol = resolveEchartsSymbol(comp.props)
  const mapSymbolSize = ((comp.props.mapSymbolSize as number) ?? 14) * visual.symbolSizeScale
  const symbolSizeByValue = comp.props.symbolSizeByValue === true
  const symbolSizeMin = ((comp.props.symbolSizeMin as number) ?? 10) * visual.symbolSizeScale
  const symbolSizeMax = ((comp.props.symbolSizeMax as number) ?? 28) * visual.symbolSizeScale

  const labelBase: Record<string, unknown> = {
    color: textColor,
    fontSize: visual.labelFontSize,
    fontWeight: visual.labelFontWeight,
    ...(visual.labelTextBorderColor
      ? {
          textBorderColor: visual.labelTextBorderColor,
          textBorderWidth: visual.labelTextBorderWidth ?? 2,
        }
      : {}),
  }

  if (loading || mapLoadError || dataError) {
    const statusText = mapLoadError ?? dataError ?? '加载中...'
    const isError = Boolean(mapLoadError || dataError)
    return {
      backgroundColor: 'transparent',
      title: {
        text: statusText,
        left: 'center',
        top: 'center',
        textStyle: { color: isError ? '#f87171' : '#64748b', fontSize: 12 },
      },
    }
  }

  const mapped = mapMapData(data, nameField, valueField)
  const fallback = getFallbackMapData(mapCfg.level, mapCfg.adcode)
  const seriesData = mapped ?? (fallback.length > 0 ? fallback : [])
  const maxVal = Math.max(...seriesData.map((d) => d.value), 1)

  const baseTitle = title
    ? {
        text: title,
        left: 'center' as const,
        top: 4,
        textStyle: { color: textColor, fontSize: textFontSize, fontWeight: 400 },
      }
    : undefined

  const visualMapBase = {
    show: showVisualMap,
    min: 0,
    max: maxVal,
    left: 12,
    bottom: 12,
    text: ['高', '低'],
    calculable: showVisualMap,
    inRange: {
      color: visual.colorScale ?? [visual.colorLow, visual.colorHigh],
    },
    textStyle: { color: textColor, fontSize: Math.max(10, textFontSize - 2) },
  }

  if (displayMode === 'symbol' && geoJson) {
    const coordMap = buildGeoCoordMap(geoJson)
    const scatterData = toScatterData(seriesData, coordMap)

    return {
      backgroundColor: 'transparent',
      title: baseTitle,
      tooltip: {
        trigger: 'item',
        formatter: ((p: { name?: string; value?: unknown }) => {
          const v = p.value
          if (Array.isArray(v) && v.length >= 3) return `${p.name ?? ''}: ${v[2]}`
          return `${p.name ?? ''}: ${v ?? ''}`
        }) as any,
      },
      geo: {
        map: mapKey,
        roam: true,
        scaleLimit: { min: 0.8, max: 4 },
        label: { show: false },
        itemStyle: {
          areaColor: visual.mapBaseAreaColor,
          borderColor: visual.borderColor,
          borderWidth: visual.borderWidth,
        },
        emphasis: {
          itemStyle: { areaColor: '#334155' },
        },
      },
      visualMap: {
        ...visualMapBase,
        seriesIndex: 0,
        dimension: 2,
      },
      series: [
        {
          type: 'scatter',
          coordinateSystem: 'geo',
          symbol: mapSymbol,
          symbolSize: (val: unknown) =>
            scatterSymbolSize(
              val,
              symbolSizeByValue,
              mapSymbolSize,
              symbolSizeMin,
              symbolSizeMax,
              maxVal,
            ),
          itemStyle: {
            shadowBlur: visual.scatterShadowBlur,
            shadowColor: visual.scatterShadowBlur > 0 ? 'rgba(0, 0, 0, 0.45)' : undefined,
          },
          data: scatterData,
          label: {
            show: showValueLabel,
            formatter: '{@[2]}',
            position: 'top',
            ...labelBase,
          },
          emphasis: {
            label: { show: true },
            itemStyle: {
              shadowBlur: visual.scatterShadowBlur + 4,
              shadowColor: 'rgba(0, 0, 0, 0.55)',
            },
          },
        },
      ],
    }
  }

  return {
    backgroundColor: 'transparent',
    title: baseTitle,
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}',
    },
    visualMap: visualMapBase,
    series: [
      {
        type: 'map',
        map: mapKey,
        roam: true,
        scaleLimit: { min: 0.8, max: 4 },
        label: {
          show: showValueLabel,
          ...labelBase,
          formatter: (params: { value?: unknown }) => {
            const v = params.value
            if (v == null || v === '') return ''
            const n = Number(v)
            return Number.isFinite(n) ? String(n) : ''
          },
        },
        emphasis: {
          label: {
            show: true,
            ...labelBase,
            formatter: (params: { name?: string; value?: unknown }) => {
              const v = params.value
              if (v == null || v === '') return params.name ?? ''
              const n = Number(v)
              const valText = Number.isFinite(n) ? String(n) : ''
              return params.name ? `${params.name}\n${valText}` : valText
            },
          },
          itemStyle: {
            areaColor: visual.emphasisAreaColor ?? visual.colorHigh,
            borderColor: visual.borderColor,
            borderWidth: visual.borderWidth + 0.5,
          },
        },
        itemStyle: {
          areaColor: visual.fillAreaColor,
          borderColor: visual.borderColor,
          borderWidth: visual.borderWidth,
        },
        data: seriesData,
      },
    ],
  }
}

// Map geo registration（须 immediate：Vue watch 默认不在挂载时执行，React useEffect 会执行）
watch(
  () => [mapConfig.value.level, mapConfig.value.adcode] as const,
  ([level, adcode]) => {
    let cancelled = false
    mapKey.value = null
    geoJson.value = null
    mapLoadError.value = null
    ensureMapRegistered(level, adcode)
      .then((result) => {
        if (!cancelled) {
          mapKey.value = result.mapKey
          geoJson.value = result.geoJson
        }
      })
      .catch((err: Error) => {
        if (!cancelled) mapLoadError.value = err.message ?? '地图加载失败'
      })
    return () => { cancelled = true }
  },
  { immediate: true },
)

function applyMapOption() {
  const instance = instanceRef.value
  if (!instance) return
  const waitingMap = !mapKey.value && !mapLoadError.value
  instance.setOption(
    buildOption(
      props.comp,
      data.value,
      loading.value || waitingMap,
      mapKey.value ?? 'china',
      geoJson.value,
      mapLoadError.value,
      dataError.value,
    ),
    true,
  )
}

// Init chart
onMounted(() => {
  if (!chartRef.value) return
  const instance = echarts.init(chartRef.value, undefined, {
    width: chartRef.value.clientWidth,
    height: chartRef.value.clientHeight,
  })
  instanceRef.value = instance
  applyMapOption()

  const resize = () => instance.resize()
  window.addEventListener('resize', resize)
  onBeforeUnmount(() => {
    window.removeEventListener('resize', resize)
    instance.dispose()
    instanceRef.value = null
  })
})

// Update chart
watch([data, loading, dataError, () => props.comp.props, () => props.comp.w, () => props.comp.h, mapKey, geoJson, mapLoadError], applyMapOption)

watch([() => props.comp.w, () => props.comp.h], () => {
  instanceRef.value?.resize()
})
</script>

<template>
  <div ref="chartRef" class="w-full h-full" />
</template>
