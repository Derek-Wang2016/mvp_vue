<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed, shallowRef, type CSSProperties } from 'vue'
import {
  type PageComponent,
  type CardFieldConfig,
  type CardEmptyDisplayConfig,
  isCardFieldVisible,
  evaluateCardEmpty,
  resolveCardGridGaps,
  type ColorDictEntry,
  type IconDictEntry,
  type AbbrevDictEntry,
} from '@mvp-vue/schema'
import { getApiBase } from '../config'
import CardListIcon from './CardListIcon.vue'
import CardListField from './cardList/CardListField.vue'
import { buildCardFieldGridEdges, resolveColor } from './cardList/fieldUtils'

const props = defineProps<{
  comp: PageComponent
  colorDict?: ColorDictEntry[]
  iconDict?: IconDictEntry[]
  abbrevDict?: AbbrevDictEntry[]
}>()

const DEV_ITEM_INSET: number | null = 4

const apiUrl = computed(() => (props.comp.props.apiUrl as string) ?? '')
const fixedParams = computed(() => (props.comp.props.fixedParams as Record<string, string>) ?? {})
const pageSize = computed(() => (props.comp.props.pageSize as number) ?? 10)
const pageFlipInterval = computed(() => (props.comp.props.pageFlipInterval as number) ?? 10)
const refreshInterval = computed(() => (props.comp.props.refreshInterval as number) ?? 0)
const dataListPath = computed(() => (props.comp.props.dataListPath as string) ?? 'data.list')
const dataTotalPath = computed(() => (props.comp.props.dataTotalPath as string) ?? 'data.total')
const cols = computed(() => (props.comp.props.cols as number) ?? 5)
const rows = computed(() => (props.comp.props.rows as number) ?? 2)
const gap = computed(() => (props.comp.props.gap as number) ?? 12)
const cardBgColor = computed(() => (props.comp.props.cardBgColor as string) ?? 'rgba(15,24,36,0.85)')
const cardBorderColor = computed(() => (props.comp.props.cardBorderColor as string) ?? '#1e293b')
const cardBorderRadius = computed(() => (props.comp.props.cardBorderRadius as number) ?? 8)
const cardGridCols = computed(() => (props.comp.props.cardGridCols as number) ?? 1)
const cardGridGaps = computed(() => resolveCardGridGaps(props.comp.props))
const cardGridRowGap = computed(() => cardGridGaps.value.row)
const cardGridColumnGap = computed(() => cardGridGaps.value.column)
const itemInset = computed(() =>
  DEV_ITEM_INSET ??
  (props.comp.props.itemInset as number | undefined) ??
  (props.comp.props.itemMargin as number | undefined) ??
  6
)
const fields = computed(() => (props.comp.props.fields as CardFieldConfig[]) ?? [])
const emptyDisplay = computed(() => props.comp.props.emptyDisplay as CardEmptyDisplayConfig | undefined)

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

const allPages = shallowRef<Record<string, unknown>[][]>([])
const currentPage = ref(0)
const loading = ref(false)
const error = ref<string | null>(null)
const fetchGeneration = ref(0)
const fetchAllRef = ref<() => Promise<void>>(async () => {})

const allItems = computed(() => allPages.value.flat())
const visualPageSize = computed(() => Math.max(1, cols.value * rows.value))
const totalVisualPages = computed(() => Math.max(1, Math.ceil(allItems.value.length / visualPageSize.value)))

function buildUrl(baseUrl: string, fp: Record<string, string>, pageNo: number, ps: number): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(fp)) { params.set(k, v) }
  params.set('pageNo', String(pageNo))
  params.set('pageSize', String(ps))
  const qs = params.toString()
  return baseUrl + (baseUrl.includes('?') ? '&' : '?') + qs
}

function resolveByPath(obj: unknown, path: string): unknown {
  const segments = path.split('.')
  let current: any = obj
  for (const seg of segments) {
    if (current == null) return null
    current = current[seg]
  }
  return current
}

function asRecordArray(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null)
}

watch(
  [apiUrl, () => JSON.stringify(fixedParams.value), pageSize, dataListPath, dataTotalPath],
  () => {
    if (!apiUrl.value) {
      loading.value = false
      error.value = '未配置 API URL'
      return
    }
    const generation = ++fetchGeneration.value
    loading.value = true
    error.value = null

    async function fetchAll() {
      try {
        const page1Url = buildUrl(apiUrl.value, fixedParams.value, 1, pageSize.value)
        const res1 = await fetch(`${getApiBase()}/api/data-proxy`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: page1Url, method: 'GET' }),
        })
        if (!res1.ok) throw new Error(`HTTP ${res1.status}`)
        const json1 = await res1.json()
        const upstream = json1.data
        const list1 = asRecordArray(resolveByPath(upstream, dataListPath.value))
        const total = Number(resolveByPath(upstream, dataTotalPath.value) ?? 0)
        const totalPages = Math.max(1, Math.ceil(total / pageSize.value))
        const pages: Record<string, unknown>[][] = [list1]
        for (let p = 2; p <= totalPages; p++) {
          const url = buildUrl(apiUrl.value, fixedParams.value, p, pageSize.value)
          const res = await fetch(`${getApiBase()}/api/data-proxy`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url, method: 'GET' }),
          })
          if (res.ok) {
            const json = await res.json()
            pages.push(asRecordArray(resolveByPath(json.data, dataListPath.value)))
          } else {
            pages.push([])
          }
        }
        if (generation !== fetchGeneration.value) return
        allPages.value = pages
        currentPage.value = 0
        loading.value = false
      } catch (err: any) {
        if (generation !== fetchGeneration.value) return
        error.value = err.message
        loading.value = false
      }
    }
    fetchAllRef.value = fetchAll
    void fetchAll()
  },
  { immediate: true },
)

watch(totalVisualPages, () => {
  if (currentPage.value >= totalVisualPages.value) currentPage.value = 0
})

let flipTimer: ReturnType<typeof setInterval> | null = null
let refreshTimer: ReturnType<typeof setInterval> | null = null

watch([totalVisualPages, pageFlipInterval, refreshInterval, apiUrl], () => {
  if (flipTimer) clearInterval(flipTimer)
  if (refreshTimer) clearInterval(refreshTimer)

  let intervalSec = 0
  if (pageFlipInterval.value > 0 && totalVisualPages.value <= 1) {
    intervalSec = pageFlipInterval.value
  } else if (pageFlipInterval.value <= 0 && refreshInterval.value > 0) {
    intervalSec = refreshInterval.value
  }
  if (intervalSec > 0 && apiUrl.value) {
    refreshTimer = setInterval(() => fetchAllRef.value(), intervalSec * 1000)
  }

  if (totalVisualPages.value > 1 && pageFlipInterval.value > 0) {
    flipTimer = setInterval(() => {
      currentPage.value = (currentPage.value + 1) % totalVisualPages.value
      if (currentPage.value === 0) fetchAllRef.value()
    }, pageFlipInterval.value * 1000)
  }
})

onBeforeUnmount(() => {
  fetchGeneration.value += 1
  if (flipTimer) clearInterval(flipTimer)
  if (refreshTimer) clearInterval(refreshTimer)
})

const FALLBACK_EMPTY_ICON: IconDictEntry = { id: '', key: '', iconType: 'preset', iconName: 'tabler:box-off' }

function resolveEmptyIcon(config: CardEmptyDisplayConfig, imap: Map<string, IconDictEntry>): IconDictEntry {
  if (config.iconDictKey) { const hit = imap.get(config.iconDictKey); if (hit) return hit }
  if (config.iconType === 'preset' && config.iconName) return { id: '', key: '', iconType: 'preset', iconName: config.iconName }
  if (config.iconType === 'custom' && config.iconSvg) return { id: '', key: '', iconType: 'custom', iconSvg: config.iconSvg }
  return FALLBACK_EMPTY_ICON
}

function buildEmptyDisplayContainerStyle(
  config: CardEmptyDisplayConfig,
  dict: ColorDictEntry[] | undefined,
  item: Record<string, unknown>,
): CSSProperties {
  const bgColorRaw = config.bgColor?.trim()
  const resolvedBg = resolveColor(dict, item, config.bgColor, undefined)
  const bgPaint = bgColorRaw?.startsWith('DICT') ? resolvedBg : bgColorRaw
  const textColorRaw = config.textColor
  const resolvedText = resolveColor(dict, item, config.textColor, undefined)
  const textColor = textColorRaw?.startsWith('DICT') ? resolvedText : textColorRaw

  const style: CSSProperties = {
    gridRow: config.gridRowSpan && config.gridRowSpan > 1
      ? `${config.gridRow ?? 'auto'} / span ${config.gridRowSpan}` : (config.gridRow ?? 'auto'),
    gridColumn: config.gridColSpan && config.gridColSpan > 1
      ? `${config.gridCol ?? 'auto'} / span ${config.gridColSpan}` : (config.gridCol ?? 'auto'),
    minWidth: 0, minHeight: 0, width: '100%', boxSizing: 'border-box',
    display: 'flex', alignItems: 'center', alignSelf: 'stretch',
    justifyContent: config.textAlign === 'center' ? 'center' : config.textAlign === 'right' ? 'flex-end' : 'flex-start',
    color: textColor,
  }
  if (bgPaint) { style.backgroundColor = bgPaint; style.padding = '2px 8px' }
  return style
}

function cardMeta(item: Record<string, unknown>) {
  const isCardEmpty = evaluateCardEmpty(item, emptyDisplay.value)
  const retainSet = new Set(emptyDisplay.value?.retainFields ?? [])
  const emptyIconEntry =
    isCardEmpty && emptyDisplay.value ? resolveEmptyIcon(emptyDisplay.value, iconMap.value) : null
  const emptyTextColorRaw = emptyDisplay.value?.textColor
  const emptyResolvedText = emptyDisplay.value
    ? resolveColor(props.colorDict, item, emptyDisplay.value.textColor, undefined)
    : undefined
  const emptyTextColor = emptyTextColorRaw?.startsWith('DICT') ? emptyResolvedText : emptyTextColorRaw

  const visibleFieldEntries = fields.value
    .map((ff, jj) => ({ f: ff, j: jj }))
    .filter(({ f: ff }) => isCardFieldVisible(ff))
  const fieldGridEdges =
    cardGridCols.value > 1
      ? buildCardFieldGridEdges(visibleFieldEntries, cardGridCols.value)
      : null

  return { isCardEmpty, retainSet, emptyIconEntry, emptyTextColor, fieldGridEdges, visibleFieldEntries }
}

function buildEmptyDisplayStyle(
  item: Record<string, unknown>,
  meta: ReturnType<typeof cardMeta>,
): CSSProperties {
  const config = emptyDisplay.value
  if (!config) return {}
  const base = buildEmptyDisplayContainerStyle(config, props.colorDict, item)
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
      display: 'flex', flexWrap: 'wrap', flexDirection: 'row',
      alignItems: 'stretch', alignContent: 'flex-start',
      gap: `${rg}px ${cg}px`,
    }
  }
  return {
    display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', gap: `${rg}px`,
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
    <div v-if="loading" class="w-full h-full flex items-center justify-center text-gray-500 text-sm">加载中...</div>
    <div v-else-if="error" class="w-full h-full flex items-center justify-center text-red-400 text-sm">{{ error }}</div>
    <div v-else-if="allItems.length === 0" class="w-full h-full flex items-center justify-center text-gray-500 text-sm">无数据</div>

    <div
      v-else
      class="w-full h-full relative"
      :style="{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`, gap: `${gap}px` }"
    >
      <div
        v-for="(item, cardIdx) in allItems.slice(currentPage * visualPageSize, currentPage * visualPageSize + visualPageSize)"
        :key="cardIdx"
        class="overflow-hidden"
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
              :size="emptyDisplay.fontSize ?? '2em'"
              :color="meta.emptyTextColor"
            />
          </div>
        </template>
      </div>

      <div v-if="totalVisualPages > 1" class="absolute bottom-1 right-2 text-[10px] text-slate-600 bg-black/40 px-1.5 py-0.5 rounded">
        {{ currentPage + 1 }}/{{ totalVisualPages }}
      </div>
    </div>
  </div>
</template>
