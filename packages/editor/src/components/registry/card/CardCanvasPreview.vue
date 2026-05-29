<script setup lang="ts">
import { computed } from 'vue'
import type { CanvasPreviewProps } from '../types'
import type { CardEmptyDisplayConfig, IconDictEntry } from '@mvp-vue/schema'
import IconDictEntryPreview from '../../IconDictEntryPreview.vue'
import { useEditorStore } from '../../../stores/editorStore'
import { storeToRefs } from 'pinia'

const props = defineProps<CanvasPreviewProps>()

const store = useEditorStore()
const { iconDict, savedIcons } = storeToRefs(store)

const cardBgColor = computed(() => (props.comp.props.cardBgColor as string) ?? 'rgba(15,24,36,0.85)')
const cardBorderColor = computed(() => (props.comp.props.cardBorderColor as string) ?? '#1e293b')
const cardBorderRadius = computed(() => (props.comp.props.cardBorderRadius as number) ?? 8)
const cardGridRowGap = computed(
  () => (props.comp.props.cardGridRowGap as number) ?? (props.comp.props.cardGridGap as number) ?? 8,
)
const fields = computed(() => (props.comp.props.fields as import('@mvp-vue/schema').CardFieldConfig[]) ?? [])
const emptyDisplay = computed(() => props.comp.props.emptyDisplay as CardEmptyDisplayConfig | undefined)
const emptyPreview = computed(() => emptyDisplay.value?.enabled === true)
const retainSet = computed(() => new Set(emptyDisplay.value?.retainFields ?? []))

const previewFields = computed(() =>
  emptyPreview.value
    ? fields.value.filter((f) => retainSet.value.has(f.field)).slice(0, 3)
    : fields.value.slice(0, 4),
)

const emptyIconPreview = computed((): IconDictEntry | undefined => {
  if (!emptyPreview.value || !emptyDisplay.value) return undefined
  const ed = emptyDisplay.value
  if (ed.iconDictKey) return iconDict.value.find((e) => e.key === ed.iconDictKey)
  if (ed.iconType === 'saved' && ed.savedIconId != null) {
    return { id: '', key: '', iconType: 'saved', savedIconId: ed.savedIconId }
  }
  if (ed.iconType === 'preset' && ed.iconName) return { id: '', key: '', iconType: 'preset', iconName: ed.iconName }
  if (ed.iconType === 'custom' && ed.iconSvg) return { id: '', key: '', iconType: 'custom', iconSvg: ed.iconSvg }
  return { id: '', key: '', iconType: 'preset', iconName: 'tabler:box-off' }
})
</script>

<template>
  <div
    class="w-full h-full overflow-hidden flex flex-col justify-center"
    :style="{
      background: cardBgColor,
      border: `1px solid ${cardBorderColor}`,
      borderRadius: `${cardBorderRadius}px`,
      padding: '6px',
      gap: `${cardGridRowGap}px`,
    }"
  >
    <div
      v-if="emptyPreview && emptyIconPreview"
      class="flex items-center justify-center py-0.5"
      :style="{
        color: emptyDisplay?.textColor ?? '#f87171',
        fontSize: emptyDisplay?.fontSize ?? '14px',
        background: emptyDisplay?.bgColor,
        borderRadius: '4px',
      }"
    >
      <IconDictEntryPreview :entry="emptyIconPreview" :saved-icons="savedIcons" :size="20" />
    </div>
    <template v-if="previewFields.length > 0">
      <div
        v-for="(f, fi) in previewFields"
        :key="fi"
        class="flex flex-row items-center gap-1 overflow-hidden"
        style="opacity: 0.55"
      >
        <span class="text-[9px] text-slate-300 shrink-0 leading-tight text-right whitespace-nowrap">
          {{ f.label || '—' }}
        </span>
        <span class="text-[9px] text-slate-400 truncate leading-tight min-w-0">{{ f.field || '—' }}</span>
      </div>
    </template>
    <div v-else class="text-[9px] text-slate-500 text-center">卡片</div>
  </div>
</template>
