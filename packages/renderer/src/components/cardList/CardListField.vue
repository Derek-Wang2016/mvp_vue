<script setup lang="ts">
import { computed } from 'vue'
import {
  type CardFieldConfig,
  formatDateValue,
  isCardFieldVisible,
  getCardFieldTagSeparator,
  splitCardFieldValueToTags,
  resolveCardTagBgColor,
  type ColorDictEntry,
  type IconDictEntry,
  type AbbrevDictEntry,
  type CustomIconRecord,
  resolveAbbrevDictValue,
} from '@mvp-vue/schema'
import CardListIcon from '../CardListIcon.vue'
import CardListQrCode from './CardListQrCode.vue'
import CardListScrollingText from './CardListScrollingText.vue'
import { buildFieldPresentation, type CardFieldGridEdge } from './fieldUtils'

const props = defineProps<{
  item: Record<string, unknown>
  f: CardFieldConfig
  j: number
  hiddenForCardEmpty: boolean
  colorDict?: ColorDictEntry[]
  iconMap: Map<string, IconDictEntry>
  savedIcons?: CustomIconRecord[]
  abbrevDict?: AbbrevDictEntry[]
  defaultLabelWidthCh: number
  itemInset: number
  cardGridCols: number
  cardGridColumnGap: number
  fieldGridEdges: Map<number, CardFieldGridEdge> | null
  isFirstVisibleField: boolean
  isLastVisibleField: boolean
}>()

const pres = computed(() =>
  buildFieldPresentation({
    item: props.item,
    f: props.f,
    j: props.j,
    hiddenForCardEmpty: props.hiddenForCardEmpty,
    colorDict: props.colorDict,
    iconMap: props.iconMap,
    defaultLabelWidthCh: props.defaultLabelWidthCh,
    itemInset: props.itemInset,
    cardGridCols: props.cardGridCols,
    cardGridColumnGap: props.cardGridColumnGap,
    fieldGridEdges: props.fieldGridEdges,
    isFirstVisibleField: props.isFirstVisibleField,
    isLastVisibleField: props.isLastVisibleField,
  }),
)

const valueContent = computed(() => {
  if (!isCardFieldVisible(props.f)) return null
  const f = props.f
  const p = pres.value
  const rawValue = String(props.item[f.field] ?? '')
  const afterDate = f.dateFormat ? formatDateValue(props.item[f.field], f.dateFormat) : rawValue
  const useAbbrev = f.abbrevDictEnabled === true && f.valueDisplay !== 'icon' && f.valueDisplay !== 'qrcode'
  const displayValue = useAbbrev ? resolveAbbrevDictValue(props.abbrevDict, afterDate) : afterDate

  if (f.valueDisplay === 'qrcode' && afterDate.trim()) {
    return {
      kind: 'qrcode' as const,
      qrText: afterDate,
      qrSizePx: f.qrSizePx,
      qrMargin: f.qrMargin,
      qrColor: f.qrColor,
      qrBgColor: f.qrBgColor,
    }
  }

  if (f.tagSplitEnabled) {
    const rawTags = splitCardFieldValueToTags(afterDate, getCardFieldTagSeparator(f))
    if (rawTags.length > 0) {
      return {
        kind: 'tags' as const,
        tagLayout: (f.tagLayout ?? 'inline') as 'inline' | 'stack',
        tagItems: rawTags.map((matchKey) => ({
          matchKey,
          display: useAbbrev ? resolveAbbrevDictValue(props.abbrevDict, matchKey) : matchKey,
        })),
      }
    }
  }

  if (f.valueDisplay === 'icon' && displayValue) {
    const iconEntry = props.iconMap.get(displayValue)
    if (iconEntry) {
      return { kind: 'icon' as const, iconEntry, displayValue }
    }
  }

  const valueText = displayValue === '' ? (p.wantsBgSlot ? '\u00a0' : '') : displayValue
  return { kind: 'text' as const, valueText }
})

const valueQrStyle = computed(() => {
  const p = pres.value
  return {
    ...p.valueStyle,
    display: 'flex',
    width: p.valueFillsCell || p.layoutId === 'value-only' || p.layoutId === 'label-above' ? '100%' : p.valueStyle.width,
    flex: p.wantsBgSlot || p.valueFillsCell ? '1 1 0%' : undefined,
    minWidth: p.wantsBgSlot || p.valueFillsCell ? '0' : undefined,
    alignItems: 'center',
    justifyContent:
      props.f.textAlign === 'center' ? 'center' : props.f.textAlign === 'right' ? 'flex-end' : 'flex-start',
  } as Record<string, string>
})

const valueIconStyle = computed(() => {
  const p = pres.value
  return {
    ...p.valueStyle,
    display: 'flex',
    width: p.valueFillsCell || p.layoutId === 'value-only' || p.layoutId === 'label-above' ? '100%' : p.valueStyle.width,
    flex: p.wantsBgSlot || p.valueFillsCell ? '1 1 0%' : undefined,
    minWidth: p.wantsBgSlot || p.valueFillsCell ? '0' : undefined,
    alignItems: 'center',
    justifyContent:
      props.f.textAlign === 'center' ? 'center' : props.f.textAlign === 'right' ? 'flex-end' : 'flex-start',
  } as Record<string, string>
})

const tagStackMode = computed(
  () => valueContent.value?.kind === 'tags' && valueContent.value.tagLayout === 'stack',
)

function tagJustifyContent(): string {
  const align = props.f.textAlign
  return align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start'
}

const tagContainerStyle = computed(() => {
  const p = pres.value
  const f = props.f
  const stack = tagStackMode.value
  return {
    ...p.valueStyle,
    display: 'flex',
    flexDirection: stack ? 'column' : undefined,
    flexWrap: stack ? undefined : 'wrap',
    alignItems: stack ? 'stretch' : 'center',
    alignContent: stack ? undefined : 'center',
    gap: '4px',
    overflow: 'hidden',
    width: stack ? '100%' : undefined,
    minWidth: p.valueStyle.minWidth || '0',
    maxWidth: p.valueStyle.maxWidth || '100%',
    justifyContent: stack ? undefined : tagJustifyContent(),
  } as Record<string, string>
})

function tagChipStyle(tag: { matchKey: string; display: string }, stack: boolean): Record<string, string> {
  const f = props.f
  const p = pres.value
  const base: Record<string, string> = {
    lineHeight: '1.35',
    boxSizing: 'border-box',
    color: p.textColor ?? '',
    backgroundColor: resolveCardTagBgColor(props.colorDict, props.item, f.tagBgColor, tag.matchKey) ?? '',
  }
  if (f.fontSize) base.fontSize = f.fontSize
  if (f.fontWeight) base.fontWeight = f.fontWeight
  if (stack) {
    return {
      ...base,
      display: 'flex',
      alignItems: 'center',
      width: '100%',
      minWidth: '0',
      padding: '4px 8px',
      justifyContent: tagJustifyContent(),
    }
  }
  return {
    ...base,
    display: 'inline-flex',
    alignItems: 'center',
    whiteSpace: 'nowrap',
    borderRadius: '4px',
    padding: '2px 8px',
  }
}
</script>

<template>
  <template v-if="isCardFieldVisible(f)">
    <hr
      v-if="pres.isDivider"
      class="border-white/10 my-0.5"
      :style="pres.dividerStyle"
    />

    <div
      v-else
      :class="pres.containerClass"
      :style="pres.containerStyle"
    >
      <span
        v-if="pres.showLabel"
        :class="pres.labelClass"
        :style="{ ...pres.labelStyle, display: pres.labelStyle.display || 'flex' }"
      >
        <CardListIcon
          v-if="pres.labelIconEntry"
          :entry="pres.labelIconEntry"
          :saved-icons="savedIcons"
          :size="f.labelFontSize ?? f.fontSize ?? '1em'"
          :color="pres.labelTextColor ?? pres.textColor"
        />
        <template v-else>{{ f.label }}</template>
      </span>

      <span
        v-if="valueContent?.kind === 'tags'"
        :class="pres.valueClass"
        :style="tagContainerStyle"
      >
        <span
          v-for="(tag, ti) in valueContent.tagItems"
          :key="`${tag.matchKey}-${ti}`"
          :class="valueContent.tagLayout === 'stack' ? 'min-w-0' : 'inline-flex items-center whitespace-nowrap rounded px-2 py-0.5'"
          :style="tagChipStyle(tag, valueContent.tagLayout === 'stack')"
        >{{ tag.display }}</span>
      </span>

      <span
        v-else-if="valueContent?.kind === 'qrcode'"
        :class="pres.valueClass"
        :style="valueQrStyle"
      >
        <CardListQrCode
          :text="valueContent.qrText"
          :size-px="valueContent.qrSizePx"
          :margin="valueContent.qrMargin"
          :color="valueContent.qrColor"
          :bg-color="valueContent.qrBgColor"
        />
      </span>

      <span
        v-else-if="valueContent?.kind === 'icon'"
        :class="pres.valueClass"
        :style="valueIconStyle"
      >
        <CardListIcon
          :entry="valueContent.iconEntry"
          :saved-icons="savedIcons"
          :size="f.fontSize ?? '1em'"
          :color="pres.textColor"
        />
      </span>

      <CardListScrollingText
        v-else-if="valueContent?.kind === 'text'"
        :class-name="pres.valueClass"
        :field-style="pres.valueStyle"
        :text="valueContent.valueText"
      />
    </div>
  </template>
</template>
