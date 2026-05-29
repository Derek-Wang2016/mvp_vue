<script setup lang="ts">
import { computed, ref, nextTick, onMounted, onUpdated } from 'vue'
import type { PageComponent, ColorDictEntry, IconDictEntry, AbbrevDictEntry, CustomIconRecord } from '@mvp-vue/schema'
import { resolveAbbrevDictValue, filterKeyValueTagItems } from '@mvp-vue/schema'
import { useData } from '../composables/useData'
import CardListIcon from './CardListIcon.vue'

const props = defineProps<{
  comp: PageComponent
  colorDict?: ColorDictEntry[]
  iconDict?: IconDictEntry[]
  savedIcons?: CustomIconRecord[]
  abbrevDict?: AbbrevDictEntry[]
}>()

const { data, loading, error } = useData(props.comp.dataSourceId)

const keyField = computed(() => (props.comp.props.keyField as string) ?? 'name')
const valueField = computed(() => (props.comp.props.valueField as string) ?? 'value')
const direction = computed(() => (props.comp.props.direction as string) ?? 'horizontal')
const gap = computed(() => (props.comp.props.gap as number) ?? 8)
const maxPerRow = computed(() => (props.comp.props.maxPerRow as number) ?? 0)
const maxPerCol = computed(() => (props.comp.props.maxPerCol as number) ?? 0)
const itemEqualHeight = computed(() => props.comp.props.itemEqualHeight === true)
const itemHeight = computed(() => {
  const v = props.comp.props.itemHeight
  return typeof v === 'number' && v > 0 ? Math.max(24, Math.round(v)) : 40
})
// 只要开启等高且为 TAG 模式，就自动按项内纵向跑马灯
const enableItemAutoScrollY = computed(() => itemEqualHeight.value && tagSplitEnabled.value)

const tagViewportEls = new Map<string, HTMLElement>()
const tagTrackEls = new Map<string, HTMLElement>()
const tagContentEls = new Map<string, HTMLElement>()
const tagOverflowById = ref<Record<string, boolean>>({})

function itemTagId(idx: number, item: KvItem): string {
  return `${idx}:${item.key}`
}

function setTagViewportRef(id: string, el: HTMLElement | null) {
  if (el) tagViewportEls.set(id, el)
  else tagViewportEls.delete(id)
}

function setTagTrackRef(id: string, el: HTMLElement | null) {
  if (el) tagTrackEls.set(id, el)
  else tagTrackEls.delete(id)
}

function setTagContentRef(id: string, el: HTMLElement | null) {
  if (el) tagContentEls.set(id, el)
  else tagContentEls.delete(id)
}

async function refreshTagOverflowState() {
  await nextTick()
  if (!enableItemAutoScrollY.value) {
    if (Object.keys(tagOverflowById.value).length > 0) tagOverflowById.value = {}
    return
  }

  const next: Record<string, boolean> = {}
  for (const [id, viewportEl] of tagViewportEls) {
    const contentEl = tagContentEls.get(id)
    if (!contentEl) continue
    // 仅基于“原始首屏内容”判定是否跨行，避免复制轨道导致误判持续滚动
    next[id] = contentEl.scrollHeight > viewportEl.clientHeight + 1
  }

  const prev = tagOverflowById.value
  const prevKeys = Object.keys(prev)
  const nextKeys = Object.keys(next)
  const sameSize = prevKeys.length === nextKeys.length
  const sameValue = sameSize && nextKeys.every((k) => prev[k] === next[k])
  if (!sameValue) tagOverflowById.value = next
}

function shouldAutoScrollTags(itemId: string): boolean {
  if (!enableItemAutoScrollY.value) return false
  return tagOverflowById.value[itemId] === true
}
const itemEqualWidth = computed(() => props.comp.props.itemEqualWidth === true)
const keyValueColumnGap = computed(() => {
  const v = props.comp.props.keyValueColumnGap
  return typeof v === 'number' ? v : 8
})
const keyColumnWidth = computed(() => {
  const v = props.comp.props.keyColumnWidth
  return typeof v === 'number' && v > 0 ? Math.round(v) : 0
})
const keyWidthsMap = computed(() => {
  const raw = props.comp.props.keyWidths
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {} as Record<string, number>
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && v > 0) out[k] = Math.round(v)
  }
  return out
})

function resolveKeyColumnWidthPx(itemKey: string): number | null {
  const perKey = keyWidthsMap.value[itemKey]
  if (typeof perKey === 'number' && perKey > 0) return perKey
  if (keyColumnWidth.value > 0) return keyColumnWidth.value
  return null
}

function itemContentStyleFor(itemKey: string) {
  if (itemEqualWidth.value) {
    const keyW = resolveKeyColumnWidthPx(itemKey)
    const cols = keyW != null ? `${keyW}px 1fr` : '1fr 1fr'
    const style: Record<string, string> = {
      display: 'grid',
      gridTemplateColumns: cols,
      columnGap: `${keyValueColumnGap.value}px`,
      alignItems: enableItemAutoScrollY.value ? 'start' : 'center',
      width: '100%',
      minWidth: '0',
    }
    if (itemEqualHeight.value) {
      style.height = '100%'
      style.minHeight = '0'
      style.overflow = 'hidden'
    }
    return style
  }
  const style: Record<string, string> = {
    display: 'flex',
    alignItems: enableItemAutoScrollY.value ? 'flex-start' : 'center',
    gap: '4px',
    minWidth: '0',
    flex: '1 1 auto',
  }
  if (itemEqualHeight.value) {
    style.height = '100%'
    style.minHeight = '0'
    style.overflow = 'hidden'
  }
  return style
}

const itemBoxEnabled = computed(() => props.comp.props.itemBoxEnabled !== false)
const itemBoxBgColor = computed(() => (props.comp.props.itemBoxBgColor as string) ?? 'rgba(255,255,255,0.06)')
const itemBoxBorderColor = computed(() => (props.comp.props.itemBoxBorderColor as string) ?? 'rgba(148,163,184,0.4)')
const itemBoxBorderWidth = computed(() => {
  const v = props.comp.props.itemBoxBorderWidth
  return typeof v === 'number' ? v : 1
})
const itemBoxBorderStyle = computed(() => (props.comp.props.itemBoxBorderStyle as string) ?? 'solid')
const itemBoxBorderRadius = computed(() => {
  const v = props.comp.props.itemBoxBorderRadius
  return typeof v === 'number' ? v : 6
})
const itemBoxPadding = computed(() => {
  const v = props.comp.props.itemBoxPadding
  return typeof v === 'number' ? v : 8
})

const labelFontSize = computed(() => (props.comp.props.labelFontSize as string) ?? '14px')
const labelFontWeight = computed(() => (props.comp.props.labelFontWeight as string) ?? 'bold')
const labelColor = computed(() => (props.comp.props.labelColor as string) ?? '#94a3b8')
const labelBgColor = computed(() => (props.comp.props.labelBgColor as string) ?? 'transparent')
const labelFontFamily = computed(() => (props.comp.props.labelFontFamily as string) ?? 'sans-serif')

const valueFontSize = computed(() => (props.comp.props.valueFontSize as string) ?? '14px')
const valueFontWeight = computed(() => (props.comp.props.valueFontWeight as string) ?? 'normal')
const valueColor = computed(() => (props.comp.props.valueColor as string) ?? '#e2e8f0')
const valueBgColor = computed(() => (props.comp.props.valueBgColor as string) ?? 'rgba(255,255,255,0.08)')
const valueFontFamily = computed(() => (props.comp.props.valueFontFamily as string) ?? 'sans-serif')
const valueBorderRadius = computed(() => (props.comp.props.valueBorderRadius as number) ?? 4)

const tagSplitEnabled = computed(() => (props.comp.props.tagSplitEnabled as boolean) ?? false)
const tagSeparator = computed(() => (props.comp.props.tagSeparator as string) ?? ',')
const tagGap = computed(() => (props.comp.props.tagGap as number) ?? 4)
const tagWidth = computed(() => {
  const v = props.comp.props.tagWidth
  return typeof v === 'number' && v > 0 ? Math.max(16, Math.round(v)) : 48
})
const showValueCount = computed(() => (props.comp.props.showValueCount as boolean) ?? false)

const labelAbbrevEnabled = computed(() => (props.comp.props.labelAbbrevEnabled as boolean) ?? false)
const labelColorDictEnabled = computed(() => (props.comp.props.labelColorDictEnabled as boolean) ?? false)
const labelIconDictEnabled = computed(() => (props.comp.props.labelIconDictEnabled as boolean) ?? false)

interface KvItem {
  key: string
  value: string
  tags: string[]
  tagCount: number
}

/** 与 ChartRenderer 一致：优先用户配置字段，再尝试 KEY/VALUE 等常见列名 */
const KEY_FALLBACKS = ['KEY', 'key', 'name', 'label', 'title']
const VALUE_FALLBACKS = ['VALUE', 'value', 'val', 'count', 'amount']

function pickKey(obj: Record<string, unknown>, preferred: string | undefined, fallbacks: string[]): string | undefined {
  if (preferred && preferred in obj) return preferred
  for (const k of fallbacks) {
    if (k in obj) return k
  }
  return undefined
}

/** 支持 dataPath 未配置时上游仍返回 { code, data: [...] } 的情况 */
function asRowArray(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>).data)) {
    return (raw as Record<string, unknown>).data as unknown[]
  }
  return []
}

function rowToKvItem(row: unknown): KvItem {
  const obj = (row && typeof row === 'object' ? row : {}) as Record<string, unknown>
  const kf = pickKey(obj, keyField.value, KEY_FALLBACKS)
  const vf = pickKey(obj, valueField.value, VALUE_FALLBACKS)
  const rawKey = kf ? String(obj[kf] ?? '') : ''
  const rawValue = vf ? String(obj[vf] ?? '') : ''

  let tags: string[] = []
  if (tagSplitEnabled.value && rawValue) {
    const sep = tagSeparator.value || ','
    tags = rawValue.split(sep).map(t => t.trim()).filter(t => t.length > 0)
  }

  return {
    key: rawKey,
    value: rawValue,
    tags,
    tagCount: tags.length,
  }
}

const items = computed<KvItem[]>(() => {
  const rows = asRowArray(data.value)
  if (rows.length === 0) return []

  const all = rows.map(rowToKvItem)
  return filterKeyValueTagItems(all, props.comp.props.visibleKeys, props.comp.props.hiddenKeys)
})

onMounted(() => {
  void refreshTagOverflowState()
})

onUpdated(() => {
  void refreshTagOverflowState()
})

function resolveLabelDisplay(label: string): { text: string; color?: string; icon?: IconDictEntry } {
  let text = label
  let color: string | undefined
  let icon: IconDictEntry | undefined

  if (labelAbbrevEnabled.value) {
    text = resolveAbbrevDictValue(props.abbrevDict, label)
  }

  if (labelColorDictEnabled.value && props.colorDict?.length) {
    const match = props.colorDict.find(e => e.key === label)
    if (match) color = match.matchColor
  }

  if (labelIconDictEnabled.value && props.iconDict?.length) {
    icon = props.iconDict.find(e => e.key === label)
  }

  return { text, color, icon }
}

const containerStyle = computed(() => {
  const isHorizontal = direction.value === 'horizontal'
  const style: Record<string, string> = {
    display: 'flex',
    flexDirection: isHorizontal ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: `${gap.value}px`,
    overflowX: 'hidden',
    overflowY: 'hidden',
    width: '100%',
    height: '100%',
    alignItems: 'flex-start',
  }
  if (isHorizontal && maxPerRow.value > 0) {
    style.maxWidth = `calc(${maxPerRow.value} * (100% / ${maxPerRow.value}))`
  }
  return style
})

const itemSlotStyle = computed(() => {
  const style: Record<string, string> = {
    maxWidth: '100%',
    boxSizing: 'border-box',
  }
  if (itemEqualWidth.value) {
    style.flex = '1 1 0'
    style.minWidth = '0'
    if (direction.value === 'vertical') style.width = '100%'
  }
  if (direction.value === 'horizontal' && maxPerRow.value > 0) {
    style.flexBasis = `calc((100% - ${gap.value * (maxPerRow.value - 1)}px) / ${maxPerRow.value})`
    if (itemEqualWidth.value) style.flexGrow = '1'
  }
  if (direction.value === 'vertical' && maxPerCol.value > 0) {
    style.flexBasis = `calc((100% - ${gap.value * (maxPerCol.value - 1)}px) / ${maxPerCol.value})`
    if (itemEqualWidth.value) style.flexGrow = '1'
  }
  if (itemEqualHeight.value) {
    style.height = `${itemHeight.value}px`
    style.minHeight = `${itemHeight.value}px`
    style.maxHeight = `${itemHeight.value}px`
    style.overflow = 'hidden'
  }
  return style
})

const itemBoxStyle = computed(() => {
  const style: Record<string, string> = {
    display: 'flex',
    position: 'relative',
    alignItems: 'center',
    gap: '4px',
    maxWidth: '100%',
    boxSizing: 'border-box',
  }
  if (itemEqualWidth.value) {
    style.width = '100%'
  }
  if (itemEqualHeight.value) {
    style.height = '100%'
    style.minHeight = '0'
    style.maxHeight = '100%'
    style.overflow = 'hidden'
  }
  if (!itemBoxEnabled.value) return style

  const pad = itemBoxPadding.value
  style.padding = `${pad}px`
  style.borderRadius = `${itemBoxBorderRadius.value}px`
  if (itemBoxBgColor.value && itemBoxBgColor.value !== 'transparent') {
    style.background = itemBoxBgColor.value
  }
  const bw = itemBoxBorderWidth.value
  const bs = itemBoxBorderStyle.value
  if (bs !== 'none' && bw > 0) {
    style.border = `${bw}px ${bs} ${itemBoxBorderColor.value}`
  }
  return style
})

const labelCellStyle = computed(() =>
  itemEqualWidth.value
    ? {
        justifySelf: 'end',
        textAlign: 'right' as const,
        minWidth: '0',
        maxWidth: '100%',
      }
    : {},
)

const valueCellStyle = computed(() => {
  if (!itemEqualWidth.value) return {}
  const tagLayout = tagSplitEnabled.value
    ? {
        justifySelf: 'start' as const,
        justifyContent: 'flex-start' as const,
        textAlign: 'left' as const,
      }
    : {
        justifySelf: 'start' as const,
        textAlign: 'left' as const,
      }
  return {
    ...tagLayout,
    minWidth: '0',
    maxWidth: '100%',
    display: tagSplitEnabled.value ? 'block' : 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: tagSplitEnabled.value ? `${tagGap.value}px` : '4px',
    ...(enableItemAutoScrollY.value && tagSplitEnabled.value
      ? { height: '100%', overflow: 'hidden' }
      : {}),
  }
})

function tagContainerStyle(): Record<string, string> {
  return {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: `${tagGap.value}px`,
    minWidth: '0',
    maxWidth: '100%',
  }
}

function tagTrackStyle(active: boolean): Record<string, string> {
  if (!active) return {}
  return {
    display: 'flex',
    flexDirection: 'column',
    gap: `${tagGap.value}px`,
    willChange: 'transform',
  }
}

function tagViewportStyle(): Record<string, string> {
  return enableItemAutoScrollY.value
    ? { minWidth: '0', maxWidth: '100%', height: '100%', overflow: 'hidden' }
    : { minWidth: '0', maxWidth: '100%' }
}

function tagChipStyle(): Record<string, string> {
  return {
    boxSizing: 'border-box',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    width: `${tagWidth.value}px`,
    minWidth: `${tagWidth.value}px`,
    maxWidth: `${tagWidth.value}px`,
    fontSize: valueFontSize.value,
    fontWeight: valueFontWeight.value,
    color: valueColor.value,
    background: valueBgColor.value,
    fontFamily: valueFontFamily.value !== 'inherit' ? valueFontFamily.value : 'inherit',
    borderRadius: `${valueBorderRadius.value}px`,
    padding: '2px 4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }
}
</script>

<template>
  <div :style="containerStyle">
    <div
      v-if="loading"
      class="w-full h-full flex items-center justify-center text-slate-500 text-xs"
    >
      加载中…
    </div>
    <div
      v-else-if="error"
      class="w-full h-full flex items-center justify-center text-red-400/90 text-xs px-2 text-center"
    >
      {{ error }}
    </div>
    <template v-else v-for="(item, idx) in items" :key="idx">
      <div :style="itemSlotStyle">
        <div :style="itemBoxStyle">
          <div :style="itemContentStyleFor(item.key)">
        <!-- Label with optional icon and color dict -->
        <span
          :class="itemEqualWidth ? 'min-w-0 max-w-full' : 'whitespace-nowrap shrink-0'"
          :style="{
            ...labelCellStyle,
            fontSize: labelFontSize,
            fontWeight: labelFontWeight,
            color: resolveLabelDisplay(item.key).color ?? labelColor,
            background: labelBgColor !== 'transparent' ? labelBgColor : undefined,
            fontFamily: labelFontFamily !== 'inherit' ? labelFontFamily : undefined,
            padding: labelBgColor !== 'transparent' ? '2px 6px' : undefined,
            borderRadius: labelBgColor !== 'transparent' ? `${valueBorderRadius}px` : undefined,
          }"
        >
          <span
            v-if="resolveLabelDisplay(item.key).icon"
            class="inline-block align-text-bottom mr-0.5"
          >
            <CardListIcon
              :entry="resolveLabelDisplay(item.key).icon!"
              :saved-icons="savedIcons"
              :size="labelFontSize"
            />
          </span>
          {{ resolveLabelDisplay(item.key).text }}
          <template v-if="showValueCount && item.tagCount > 1">({{ item.tagCount }})</template>
        </span>

        <!-- Tag mode: split value into colored tags -->
        <div
          v-if="tagSplitEnabled && item.tags.length > 0"
          :ref="(el) => setTagViewportRef(itemTagId(idx, item), (el as HTMLElement | null))"
          :style="itemEqualWidth ? { ...valueCellStyle, ...tagViewportStyle() } : tagViewportStyle()"
        >
          <div
            :ref="(el) => setTagTrackRef(itemTagId(idx, item), (el as HTMLElement | null))"
            :class="{ 'kv-tag-track-scroll': shouldAutoScrollTags(itemTagId(idx, item)) }"
            :style="tagTrackStyle(shouldAutoScrollTags(itemTagId(idx, item)))"
          >
            <div
              :ref="(el) => setTagContentRef(itemTagId(idx, item), (el as HTMLElement | null))"
              :style="tagContainerStyle()"
            >
              <span
                v-for="(tag, ti) in item.tags"
                :key="`tag-a-${ti}`"
                :style="tagChipStyle()"
                :title="tag"
              >{{ tag }}</span>
            </div>
            <div v-if="shouldAutoScrollTags(itemTagId(idx, item))" :style="tagContainerStyle()" aria-hidden="true">
              <span
                v-for="(tag, ti) in item.tags"
                :key="`tag-b-${ti}`"
                :style="tagChipStyle()"
                :title="tag"
              >{{ tag }}</span>
            </div>
          </div>
        </div>

        <!-- Non-tag mode: plain value -->
        <span
          v-else
          :class="itemEqualWidth ? 'min-w-0 max-w-full' : 'whitespace-nowrap inline-flex items-center min-w-0'"
          :style="{
            ...valueCellStyle,
            fontSize: valueFontSize,
            fontWeight: valueFontWeight,
            color: valueColor,
            background: valueBgColor !== 'transparent' ? valueBgColor : undefined,
            fontFamily: valueFontFamily !== 'inherit' ? valueFontFamily : undefined,
            borderRadius: `${valueBorderRadius}px`,
            padding: valueBgColor !== 'transparent' ? '2px 6px' : undefined,
          }"
        >{{ item.value }}</span>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
@keyframes kv-tag-vertical-marquee {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(0, calc(-50% - 2px), 0);
  }
}

.kv-tag-track-scroll {
  animation-name: kv-tag-vertical-marquee;
  animation-duration: 6s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-play-state: running;
}
</style>
