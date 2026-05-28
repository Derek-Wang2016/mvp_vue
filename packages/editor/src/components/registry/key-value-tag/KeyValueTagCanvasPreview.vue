<script setup lang="ts">
import { computed } from 'vue'
import { filterKeyValueTagItems, parseKeyValueTagKeyList } from '@mvp-vue/schema'
import type { CanvasPreviewProps } from '../types'

const props = defineProps<CanvasPreviewProps>()

const direction = computed(() => (props.comp.props.direction as string) ?? 'horizontal')
const gap = computed(() => (props.comp.props.gap as number) ?? 8)
const itemEqualHeight = computed(() => props.comp.props.itemEqualHeight === true)
const itemHeight = computed(() => {
  const v = props.comp.props.itemHeight
  return typeof v === 'number' && v > 0 ? Math.max(24, Math.round(v)) : 40
})
// 只要开启等高且为 TAG 模式，就自动按项内纵向跑马灯
const enableItemAutoScrollY = computed(() => itemEqualHeight.value && tagSplitEnabled.value)

function shouldAutoScrollTags(tags: string[]): boolean {
  if (!enableItemAutoScrollY.value) return false
  // 预览使用固定示例数据，阈值提高以避免单行场景出现重复行
  return tags.length > 3
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

function itemInnerStyleFor(itemKey: string) {
  if (itemEqualWidth.value) {
    const keyW = resolveKeyColumnWidthPx(itemKey)
    const cols = keyW != null ? `${keyW}px 1fr` : '1fr 1fr'
    const style: Record<string, string> = {
      display: 'grid',
      gridTemplateColumns: cols,
      columnGap: `${keyValueColumnGap.value}px`,
      alignItems: enableItemAutoScrollY.value ? 'start' : 'center',
      width: '100%',
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
    gap: '6px',
  }
  if (itemEqualHeight.value) {
    style.height = '100%'
    style.minHeight = '0'
    style.overflow = 'hidden'
  }
  return style
}
const isHorizontal = computed(() => direction.value === 'horizontal')
const labelFontSize = computed(() => (props.comp.props.labelFontSize as string) ?? '14px')
const valueFontSize = computed(() => (props.comp.props.valueFontSize as string) ?? '14px')
const valueBorderRadius = computed(() => (props.comp.props.valueBorderRadius as number) ?? 4)
const tagSplitEnabled = computed(() => (props.comp.props.tagSplitEnabled as boolean) ?? false)
const tagGap = computed(() => (props.comp.props.tagGap as number) ?? 4)
const tagWidth = computed(() => {
  const v = props.comp.props.tagWidth
  return typeof v === 'number' && v > 0 ? Math.max(16, Math.round(v)) : 48
})

function tagContainerStyle(): Record<string, string> {
  return {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: `${tagGap.value}px`,
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
    borderRadius: `${valueBorderRadius.value}px`,
    background: 'rgba(255,255,255,0.1)',
    padding: '2px 4px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  }
}
const showValueCount = computed(() => (props.comp.props.showValueCount as boolean) ?? false)

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

const itemBoxStyle = computed(() => {
  const style: Record<string, string> = {
    display: 'flex',
    position: 'relative',
    alignItems: 'center',
    gap: '6px',
    boxSizing: 'border-box',
  }
  if (itemEqualWidth.value) {
    style.flex = '1 1 0'
    style.minWidth = '0'
    style.width = isHorizontal.value ? undefined : '100%'
  }
  if (itemEqualHeight.value) {
    style.height = `${itemHeight.value}px`
    style.minHeight = `${itemHeight.value}px`
    style.maxHeight = `${itemHeight.value}px`
    style.overflow = 'hidden'
  }
  if (!itemBoxEnabled.value) return style
  style.padding = `${itemBoxPadding.value}px`
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

const itemSlotStyle = computed(() => {
  const style: Record<string, string> = { boxSizing: 'border-box' }
  if (itemEqualWidth.value) {
    style.flex = '1 1 0'
    style.minWidth = '0'
    style.maxWidth = '100%'
  }
  if (itemEqualHeight.value) {
    style.height = `${itemHeight.value}px`
    style.minHeight = `${itemHeight.value}px`
    style.maxHeight = `${itemHeight.value}px`
    style.overflow = 'hidden'
  }
  return style
})

const allMockItems = [
  { key: '示例A', value: 'ValueA', tags: false as const },
  { key: '示例B', value: 'a,b,c', tags: true as const },
  { key: '示例C', value: 'ValueC', tags: false as const },
]

const mockItems = computed(() => {
  const withTags = allMockItems.map((item) => ({
    ...item,
    tags: item.tags && tagSplitEnabled.value,
  }))
  const allow = parseKeyValueTagKeyList(props.comp.props.visibleKeys)
  let list = withTags
  if (allow.length > 0) {
    const byKey = new Map(withTags.map((item) => [item.key, item]))
    list = allow.map((k) => byKey.get(k) ?? { key: k, value: '—', tags: false as const })
  }
  return filterKeyValueTagItems(list, [], props.comp.props.hiddenKeys)
})
</script>

<template>
  <div
    class="w-full h-full overflow-hidden"
    :style="{
      display: 'flex',
      flexDirection: isHorizontal ? 'row' : 'column',
      flexWrap: 'wrap',
      gap: `${gap}px`,
      overflowY: 'hidden',
      overflowX: 'hidden',
    }"
  >
    <div v-for="(item, idx) in mockItems" :key="idx" :style="itemSlotStyle">
      <div :style="itemBoxStyle" style="opacity: 0.6">
      <div :style="itemInnerStyleFor(item.key)">
      <span
        :class="itemEqualWidth ? '' : 'whitespace-nowrap'"
        :style="{
          fontSize: labelFontSize,
          fontWeight: 'bold',
          ...(itemEqualWidth ? { textAlign: 'right', justifySelf: 'end' } : {}),
        }"
      >{{ item.key }}<template v-if="showValueCount && item.tags">(3)</template></span>
      <div v-if="item.tags" :style="tagViewportStyle()">
        <div
          :class="{ 'kv-tag-track-scroll': shouldAutoScrollTags(['a', 'b', 'c']) }"
          :style="tagTrackStyle(shouldAutoScrollTags(['a', 'b', 'c']))"
        >
          <div :style="tagContainerStyle()">
            <span
              v-for="(tag, ti) in ['a', 'b', 'c']"
              :key="`preview-tag-a-${ti}`"
              :style="tagChipStyle()"
            >{{ tag }}</span>
          </div>
          <div v-if="shouldAutoScrollTags(['a', 'b', 'c'])" :style="tagContainerStyle()" aria-hidden="true">
            <span
              v-for="(tag, ti) in ['a', 'b', 'c']"
              :key="`preview-tag-b-${ti}`"
              :style="tagChipStyle()"
            >{{ tag }}</span>
          </div>
        </div>
      </div>
      <span
        v-else
        class="px-1.5 py-0.5 text-[10px]"
        :style="{
          fontSize: valueFontSize,
          borderRadius: `${valueBorderRadius}px`,
          background: 'rgba(255,255,255,0.08)',
        }"
      >{{ item.value }}</span>
      </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@keyframes kv-tag-preview-vertical-marquee {
  from {
    transform: translate3d(0, 0, 0);
  }
  to {
    transform: translate3d(0, calc(-50% - 2px), 0);
  }
}

.kv-tag-track-scroll {
  animation-name: kv-tag-preview-vertical-marquee;
  animation-duration: 6s;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  animation-play-state: running;
}
</style>
