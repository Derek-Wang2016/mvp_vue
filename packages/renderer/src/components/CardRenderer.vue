<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed, type CSSProperties } from 'vue'
import {
  type PageComponent,
  type CardFieldConfig,
  type CardEmptyDisplayConfig,
  type CardArrayFilterCondition,
  isCardFieldVisible,
  evaluateCardEmpty,
  resolveCardGridGaps,
  resolveByPath,
  resolveCardItem,
  type ColorDictEntry,
  type IconDictEntry,
  type AbbrevDictEntry,
  type CustomIconRecord,
} from '@mvp-vue/schema'
import { getApiBase } from '../config'
import { useData } from '../composables/useData'
import CardListIcon from './CardListIcon.vue'
import CardListField from './cardList/CardListField.vue'
import { buildCardFieldGridEdges, resolveColor } from './cardList/fieldUtils'

const props = defineProps<{
  comp: PageComponent
  colorDict?: ColorDictEntry[]
  iconDict?: IconDictEntry[]
  savedIcons?: CustomIconRecord[]
  abbrevDict?: AbbrevDictEntry[]
}>()

const apiUrl = computed(() => (props.comp.props.apiUrl as string) ?? '')
const fixedParams = computed(() => (props.comp.props.fixedParams as Record<string, string>) ?? {})
const refreshInterval = computed(() => (props.comp.props.refreshInterval as number) ?? 0)
const dataPath = computed(() => (props.comp.props.dataPath as string) ?? 'data')
const arrayFilters = computed(
  () => (props.comp.props.arrayFilters as CardArrayFilterCondition[]) ?? [],
)
const cardBgColor = computed(() => (props.comp.props.cardBgColor as string) ?? 'rgba(15,24,36,0.85)')
const cardBorderColor = computed(() => (props.comp.props.cardBorderColor as string) ?? '#1e293b')
const cardBorderRadius = computed(() => (props.comp.props.cardBorderRadius as number) ?? 8)
const cardGridCols = computed(() => (props.comp.props.cardGridCols as number) ?? 1)
const cardGridGaps = computed(() => resolveCardGridGaps(props.comp.props))
const cardGridRowGap = computed(() => cardGridGaps.value.row)
const cardGridColumnGap = computed(() => cardGridGaps.value.column)
const itemInset = computed(
  () =>
    (props.comp.props.itemInset as number | undefined) ??
    (props.comp.props.itemMargin as number | undefined) ??
    6,
)
const fields = computed(() => (props.comp.props.fields as CardFieldConfig[]) ?? [])
const emptyDisplay = computed(() => props.comp.props.emptyDisplay as CardEmptyDisplayConfig | undefined)
const noMatchText = computed(() => (props.comp.props.noMatchText as string) ?? '无匹配数据')

const useDataSource = computed(() => Boolean(props.comp.dataSourceId))

const { data: dsData, loading: dsLoading, error: dsError } = useData(props.comp.dataSourceId)

const apiUpstream = ref<unknown>(null)
const apiLoading = ref(false)
const apiError = ref<string | null>(null)
const fetchGeneration = ref(0)
const fetchApiRef = ref<() => Promise<void>>(async () => {})

function buildApiUrl(baseUrl: string, fp: Record<string, string>): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(fp)) {
    if (k.trim()) params.set(k, v)
  }
  const qs = params.toString()
  if (!qs) return baseUrl
  return baseUrl + (baseUrl.includes('?') ? '&' : '?') + qs
}

watch(
  [useDataSource, apiUrl, () => JSON.stringify(fixedParams.value), dataPath],
  () => {
    if (useDataSource.value) return

    if (!apiUrl.value) {
      apiLoading.value = false
      apiError.value = null
      apiUpstream.value = null
      return
    }

    const generation = ++fetchGeneration.value
    apiLoading.value = true
    apiError.value = null

    async function fetchApi() {
      try {
        const targetUrl = buildApiUrl(apiUrl.value, fixedParams.value)
        const res = await fetch(`${getApiBase()}/api/data-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: targetUrl, method: 'GET' }),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        if (generation !== fetchGeneration.value) return
        apiUpstream.value = json.data
        apiLoading.value = false
      } catch (err: unknown) {
        if (generation !== fetchGeneration.value) return
        apiError.value = err instanceof Error ? err.message : '请求失败'
        apiLoading.value = false
      }
    }

    fetchApiRef.value = fetchApi
    void fetchApi()
  },
  { immediate: true },
)

let refreshTimer: ReturnType<typeof setInterval> | null = null

watch([refreshInterval, apiUrl, useDataSource], () => {
  if (refreshTimer) clearInterval(refreshTimer)
  refreshTimer = null
  if (refreshInterval.value > 0 && !useDataSource.value && apiUrl.value) {
    refreshTimer = setInterval(() => fetchApiRef.value(), refreshInterval.value * 1000)
  }
})

onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer)
})

const upstream = computed(() => (useDataSource.value ? dsData.value : apiUpstream.value))

const loading = computed(() => (useDataSource.value ? dsLoading.value : apiLoading.value))

const error = computed(() => {
  if (useDataSource.value) {
    if (!props.comp.dataSourceId) return '未配置数据源'
    return dsError.value
  }
  if (!apiUrl.value) return '未配置数据源'
  return apiError.value
})

const rawAtPath = computed(() => resolveByPath(upstream.value, dataPath.value))

const item = computed(() => resolveCardItem(rawAtPath.value, arrayFilters.value))

const noMatch = computed(
  () => !loading.value && !error.value && upstream.value != null && rawAtPath.value != null && item.value == null,
)

const iconMap = computed(() => {
  const map = new Map<string, IconDictEntry>()
  if (!props.iconDict) return map
  for (const e of props.iconDict) {
    if (e.key && !map.has(e.key)) map.set(e.key, e)
  }
  return map
})

const defaultLabelWidthCh = computed(() => {
  let max = 0
  for (const f of fields.value) {
    if (!isCardFieldVisible(f)) continue
    if ((f.layoutId ?? 'default') !== 'default' || !f.label || iconMap.value.has(f.label)) continue
    max = Math.max(max, [...f.label].length)
  }
  return max
})

const FALLBACK_EMPTY_ICON: IconDictEntry = { id: '', key: '', iconType: 'preset', iconName: 'tabler:box-off' }

function resolveEmptyIcon(config: CardEmptyDisplayConfig, imap: Map<string, IconDictEntry>): IconDictEntry {
  if (config.iconDictKey) {
    const hit = imap.get(config.iconDictKey)
    if (hit) return hit
  }
  if (config.iconType === 'preset' && config.iconName) {
    return { id: '', key: '', iconType: 'preset', iconName: config.iconName }
  }
  if (config.iconType === 'custom' && config.iconSvg) {
    return { id: '', key: '', iconType: 'custom', iconSvg: config.iconSvg }
  }
  if (config.iconType === 'saved' && config.savedIconId != null) {
    return { id: '', key: '', iconType: 'saved', savedIconId: config.savedIconId }
  }
  return FALLBACK_EMPTY_ICON
}

function buildEmptyDisplayContainerStyle(
  config: CardEmptyDisplayConfig,
  dict: ColorDictEntry[] | undefined,
  row: Record<string, unknown>,
): CSSProperties {
  const bgColorRaw = config.bgColor?.trim()
  const resolvedBg = resolveColor(dict, row, config.bgColor, undefined)
  const bgPaint = bgColorRaw?.startsWith('DICT') ? resolvedBg : bgColorRaw
  const textColorRaw = config.textColor
  const resolvedText = resolveColor(dict, row, config.textColor, undefined)
  const textColor = textColorRaw?.startsWith('DICT') ? resolvedText : textColorRaw

  const style: CSSProperties = {
    gridRow:
      config.gridRowSpan && config.gridRowSpan > 1
        ? `${config.gridRow ?? 'auto'} / span ${config.gridRowSpan}`
        : (config.gridRow ?? 'auto'),
    gridColumn:
      config.gridColSpan && config.gridColSpan > 1
        ? `${config.gridCol ?? 'auto'} / span ${config.gridColSpan}`
        : (config.gridCol ?? 'auto'),
    minWidth: 0,
    minHeight: 0,
    width: '100%',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent:
      config.textAlign === 'center' ? 'center' : config.textAlign === 'right' ? 'flex-end' : 'flex-start',
    color: textColor,
  }
  if (bgPaint) {
    style.backgroundColor = bgPaint
    style.padding = '2px 8px'
  }
  return style
}

function cardMeta(row: Record<string, unknown>) {
  const isCardEmpty = evaluateCardEmpty(row, emptyDisplay.value)
  const retainSet = new Set(emptyDisplay.value?.retainFields ?? [])
  const emptyIconEntry =
    isCardEmpty && emptyDisplay.value ? resolveEmptyIcon(emptyDisplay.value, iconMap.value) : null
  const emptyTextColorRaw = emptyDisplay.value?.textColor
  const emptyResolvedText = emptyDisplay.value
    ? resolveColor(props.colorDict, row, emptyDisplay.value.textColor, undefined)
    : undefined
  const emptyTextColor = emptyTextColorRaw?.startsWith('DICT') ? emptyResolvedText : emptyTextColorRaw

  const visibleFieldEntries = fields.value
    .map((ff, jj) => ({ f: ff, j: jj }))
    .filter(({ f: ff }) => isCardFieldVisible(ff))
  const fieldGridEdges =
    cardGridCols.value > 1 ? buildCardFieldGridEdges(visibleFieldEntries, cardGridCols.value) : null

  return { isCardEmpty, retainSet, emptyIconEntry, emptyTextColor, fieldGridEdges, visibleFieldEntries }
}

function buildEmptyDisplayStyle(
  row: Record<string, unknown>,
  meta: ReturnType<typeof cardMeta>,
): CSSProperties {
  const config = emptyDisplay.value
  if (!config) return {}
  const base = buildEmptyDisplayContainerStyle(config, props.colorDict, row)
  const emptyBg = base.backgroundColor
  const spanFullRow = cardGridCols.value <= 1
  if (emptyBg && itemInset.value > 0 && spanFullRow) {
    return {
      ...base,
      marginLeft: `-${itemInset.value}px`,
      marginRight: `-${itemInset.value}px`,
      marginTop: meta.visibleFieldEntries.length === 0 ? `-${itemInset.value}px` : undefined,
      marginBottom: `-${itemInset.value}px`,
      width: `calc(100% + ${2 * itemInset.value}px)`,
      padding: `${2 + (meta.visibleFieldEntries.length === 0 ? itemInset.value : 0)}px ${8 + itemInset.value}px ${2 + itemInset.value}px ${8 + itemInset.value}px`,
      boxSizing: 'border-box',
      ...(cardGridCols.value > 1
        ? { flex: '1 1 100%', gridRow: undefined, gridColumn: undefined }
        : { flex: 1 }),
    }
  }
  return {
    ...base,
    ...(cardGridCols.value > 1
      ? { flex: '1 1 100%', width: '100%', gridRow: undefined, gridColumn: undefined }
      : { flex: 1 }),
  }
}

function cardContentFlexStyle(cgc: number, rg: number, cg: number): CSSProperties {
  if (cgc > 1) {
    return {
      display: 'flex',
      flexWrap: 'wrap',
      flexDirection: 'row',
      alignItems: 'stretch',
      alignContent: 'flex-start',
      gap: `${rg}px ${cg}px`,
    }
  }
  return {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    gap: `${rg}px`,
  }
}

function isFirstVisibleField(meta: ReturnType<typeof cardMeta>, j: number): boolean {
  return meta.visibleFieldEntries.findIndex((e) => e.j === j) === 0
}

function isLastVisibleField(meta: ReturnType<typeof cardMeta>, j: number): boolean {
  const idx = meta.visibleFieldEntries.findIndex((e) => e.j === j)
  return idx === meta.visibleFieldEntries.length - 1
}
</script>

<template>
  <div class="w-full h-full">
    <div v-if="loading" class="w-full h-full flex items-center justify-center text-gray-500 text-sm">
      加载中...
    </div>
    <div v-else-if="error" class="w-full h-full flex items-center justify-center text-red-400 text-sm">
      {{ error }}
    </div>
    <div
      v-else-if="noMatch"
      class="w-full h-full flex items-center justify-center text-gray-500 text-sm"
    >
      {{ noMatchText }}
    </div>
    <div
      v-else-if="!item"
      class="w-full h-full flex items-center justify-center text-gray-500 text-sm"
    >
      无数据
    </div>

    <div
      v-else
      class="w-full h-full overflow-hidden"
      :style="{
        background: cardBgColor,
        border: `1px solid ${cardBorderColor}`,
        borderRadius: `${cardBorderRadius}px`,
        boxSizing: 'border-box',
        padding: itemInset > 0 ? itemInset + 'px' : '0',
        ...cardContentFlexStyle(cardGridCols, cardGridRowGap, cardGridColumnGap),
      }"
    >
      <template v-for="meta in [cardMeta(item)]" :key="'meta'">
        <CardListField
          v-for="(f, j) in fields"
          :key="f.field ? `${f.field}-${j}` : `field-${j}`"
          :item="item"
          :f="f"
          :j="j"
          :hidden-for-card-empty="meta.isCardEmpty && !meta.retainSet.has(f.field)"
          :color-dict="colorDict"
          :icon-map="iconMap"
          :saved-icons="savedIcons"
          :abbrev-dict="abbrevDict"
          :default-label-width-ch="defaultLabelWidthCh"
          :item-inset="itemInset"
          :card-grid-cols="cardGridCols"
          :card-grid-column-gap="cardGridColumnGap"
          :field-grid-edges="meta.fieldGridEdges"
          :is-first-visible-field="isFirstVisibleField(meta, j)"
          :is-last-visible-field="isLastVisibleField(meta, j)"
        />

        <div
          v-if="meta.isCardEmpty && emptyDisplay && meta.emptyIconEntry"
          :style="buildEmptyDisplayStyle(item, meta)"
        >
          <CardListIcon
            :entry="meta.emptyIconEntry"
            :saved-icons="savedIcons"
            :size="emptyDisplay.fontSize ?? '2em'"
            :color="meta.emptyTextColor"
          />
        </div>
      </template>
    </div>
  </div>
</template>
