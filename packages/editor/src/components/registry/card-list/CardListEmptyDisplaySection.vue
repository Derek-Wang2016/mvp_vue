<script setup lang="ts">
import { computed } from 'vue'
import type { PageComponent, CardFieldConfig, CardEmptyDisplayConfig, IconDictEntry } from '@mvp-vue/schema'
import { Icon } from '@iconify/vue'
import ColorSwatch from '../../ColorSwatch.vue'
import EditorNumberInput from '../../EditorNumberInput.vue'
import { PROP_LABEL, PROP_HINT, PROP_SELECT_COMPACT, PROP_NUMBER_WRAP_COMPACT, PROP_NUMBER_INNER_COMPACT } from '../../propertyPanel/shared'

const props = defineProps<{
  comp: PageComponent
  iconDict: IconDictEntry[]
}>()

const emit = defineEmits<{
  'update:emptyDisplay': [patch: Partial<CardEmptyDisplayConfig>]
  toggleField: [listKey: 'watchFields' | 'retainFields', fieldName: string, checked: boolean]
  openIconPicker: []
}>()

function getEmptyDisplay(): CardEmptyDisplayConfig {
  return (props.comp.props.emptyDisplay as CardEmptyDisplayConfig) ?? {
    enabled: false,
    watchFields: [],
    watchMode: 'any',
    retainFields: [],
  }
}

function patchEmptyDisplay(patch: Partial<CardEmptyDisplayConfig>) {
  emit('update:emptyDisplay', patch)
}

const configuredFieldNames = computed(() =>
  ((props.comp.props.fields as CardFieldConfig[]) ?? [])
    .map((f) => f.field.trim())
    .filter(Boolean),
)

const cardGridColsForEmpty = computed(() => (props.comp.props.cardGridCols as number) ?? 1)

const emptyEd = computed(() => getEmptyDisplay())

const emptyIconPreview = computed(() => {
  const ed = emptyEd.value
  if (ed.iconDictKey) return props.iconDict.find((e) => e.key === ed.iconDictKey)
  if (ed.iconType) {
    return {
      id: 'empty-inline',
      key: '',
      iconType: ed.iconType,
      iconName: ed.iconName,
      iconSvg: ed.iconSvg,
    } as IconDictEntry
  }
  return null
})

const emptyIconEntry = computed((): IconDictEntry => {
  const ed = getEmptyDisplay()
  if (ed.iconType && (ed.iconName || ed.iconSvg)) {
    return { id: 'empty-inline', key: '', iconType: ed.iconType, iconName: ed.iconName, iconSvg: ed.iconSvg }
  }
  return { id: 'empty-inline', key: '', iconType: 'preset', iconName: 'tabler:box-off' }
})

function onToggleField(listKey: 'watchFields' | 'retainFields', fieldName: string, checked: boolean) {
  emit('toggleField', listKey, fieldName, checked)
}
</script>

<template>
  <div class="border-t border-white/10 pt-2 mb-2">
    <span :class="PROP_LABEL">空值显示</span>
    <p :class="[PROP_HINT, 'mt-1 mb-2 leading-relaxed']">
      监听字段为空时显示醒目图标；非保留字段将隐藏，请在卡片内部网格预留图标位置。
    </p>
    <label class="mb-2 flex cursor-pointer items-center gap-1.5">
      <input
        type="checkbox"
        class="rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-indigo-400/30"
        :checked="emptyEd.enabled === true"
        @change="patchEmptyDisplay({ enabled: ($event.target as HTMLInputElement).checked })"
      />
      <span class="text-[11px] text-slate-400">启用卡片级空态</span>
    </label>
    <template v-if="emptyEd.enabled">
      <label class="block mb-1">
        <span class="text-[11px] font-medium text-slate-400 block">判空模式</span>
        <select
          :class="PROP_SELECT_COMPACT"
          :value="emptyEd.watchMode ?? 'any'"
          @change="patchEmptyDisplay({ watchMode: ($event.target as HTMLSelectElement).value as 'any' | 'all' })"
        >
          <option value="any">任一监听字段为空</option>
          <option value="all">全部监听字段为空</option>
        </select>
      </label>
      <div class="mb-2">
        <span class="text-[11px] font-medium text-slate-400 block mb-1">监听字段</span>
        <p v-if="configuredFieldNames.length === 0" :class="PROP_HINT">请先在下方添加卡片字段</p>
        <div v-else class="flex flex-col gap-1">
          <label v-for="name in configuredFieldNames" :key="name" class="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              class="rounded border-white/20 bg-white/10 text-indigo-500"
              :checked="(emptyEd.watchFields ?? []).includes(name)"
              @change="onToggleField('watchFields', name, ($event.target as HTMLInputElement).checked)"
            />
            <span class="font-mono text-[11px] text-slate-300">{{ name }}</span>
          </label>
        </div>
      </div>
      <div class="mb-2">
        <span class="text-[11px] font-medium text-slate-400 block mb-1">保留字段</span>
        <p v-if="configuredFieldNames.length === 0" :class="PROP_HINT">—</p>
        <div v-else class="flex flex-col gap-1">
          <label v-for="name in configuredFieldNames" :key="'retain-' + name" class="flex cursor-pointer items-center gap-1.5">
            <input
              type="checkbox"
              class="rounded border-white/20 bg-white/10 text-emerald-500"
              :checked="(emptyEd.retainFields ?? []).includes(name)"
              @change="onToggleField('retainFields', name, ($event.target as HTMLInputElement).checked)"
            />
            <span class="font-mono text-[11px] text-slate-300">{{ name }}</span>
          </label>
        </div>
      </div>
      <label class="block mb-1">
        <span class="text-[11px] font-medium text-slate-400 block">图标字典</span>
        <select
          :class="PROP_SELECT_COMPACT"
          :value="emptyEd.iconDictKey ?? ''"
          @change="
            ($event) => {
              const v = ($event.target as HTMLSelectElement).value
              if (v) {
                patchEmptyDisplay({ iconDictKey: v, iconType: undefined, iconName: undefined, iconSvg: undefined })
              } else {
                patchEmptyDisplay({ iconDictKey: undefined })
              }
            }
          "
        >
          <option value="">不使用字典（自定义）</option>
          <option v-for="e in iconDict" :key="e.id" :value="e.key">{{ e.key }}</option>
        </select>
      </label>
      <template v-if="!emptyEd.iconDictKey">
        <div class="mb-2 flex items-center gap-2">
          <button
            type="button"
            class="flex-1 rounded border border-white/15 bg-white/[0.08] px-2 py-1.5 text-[11px] text-slate-300 hover:bg-white/[0.12] transition-colors"
            @click="emit('openIconPicker')"
          >
            选择空值图标…
          </button>
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-white/10 bg-white/5 text-slate-400">
            <template v-if="emptyIconPreview?.iconType === 'preset' && emptyIconPreview.iconName">
              <Icon :icon="emptyIconPreview.iconName" :width="18" :height="18" />
            </template>
            <template v-else-if="emptyIconPreview?.iconType === 'custom' && emptyIconPreview.iconSvg">
              <span class="inline-flex h-4 w-4" v-html="emptyIconPreview.iconSvg" />
            </template>
            <span v-else class="text-[9px]">—</span>
          </div>
        </div>
      </template>
      <div class="flex gap-1 items-start mb-1">
        <div class="flex-1">
          <span class="text-[11px] font-medium text-slate-400 block">字号</span>
          <input
            class="w-full mt-1 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
            placeholder="2em"
            :value="emptyEd.fontSize ?? ''"
            @input="patchEmptyDisplay({ fontSize: ($event.target as HTMLInputElement).value || undefined })"
          />
        </div>
        <label class="block flex-1">
          <span class="text-[11px] font-medium text-slate-400 block">对齐</span>
          <select
            :class="PROP_SELECT_COMPACT"
            :value="emptyEd.textAlign ?? ''"
            @change="patchEmptyDisplay({ textAlign: (($event.target as HTMLSelectElement).value || undefined) as CardEmptyDisplayConfig['textAlign'] })"
          >
            <option value="">默认</option>
            <option value="left">← 左</option>
            <option value="center">◼ 中</option>
            <option value="right">→ 右</option>
          </select>
        </label>
      </div>
      <div class="flex gap-1 items-start mb-1">
        <div class="flex-1">
          <span class="text-[11px] font-medium text-slate-400 block">文字色</span>
          <div class="flex gap-1 mt-0.5">
            <ColorSwatch
              class="w-8 h-8 shrink-0 border border-white/10"
              :value="emptyEd.textColor ?? '#f87171'"
              @change="(textColor: string) => patchEmptyDisplay({ textColor })"
            />
            <input
              class="w-0 flex-1 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 font-mono min-w-0 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
              :value="emptyEd.textColor ?? ''"
              placeholder="#f87171"
              @input="patchEmptyDisplay({ textColor: ($event.target as HTMLInputElement).value || undefined })"
            />
          </div>
        </div>
        <div class="flex-1">
          <span class="text-[11px] font-medium text-slate-400 block">底色</span>
          <div class="flex gap-1 mt-0.5">
            <ColorSwatch
              class="w-8 h-8 shrink-0 border border-white/10"
              :value="emptyEd.bgColor ?? '#000000'"
              @change="(bgColor: string) => patchEmptyDisplay({ bgColor })"
            />
            <input
              class="w-0 flex-1 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 font-mono min-w-0 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
              :value="emptyEd.bgColor ?? ''"
              placeholder="可选"
              @input="patchEmptyDisplay({ bgColor: ($event.target as HTMLInputElement).value || undefined })"
            />
          </div>
        </div>
      </div>
      <template v-if="cardGridColsForEmpty > 1">
        <div class="flex gap-1 mb-1">
          <label class="block flex-1">
            <span class="text-[11px] font-medium text-slate-400 block">列</span>
            <EditorNumberInput
              :min="1"
              :max="cardGridColsForEmpty"
              :class="PROP_NUMBER_WRAP_COMPACT"
              :input-class="PROP_NUMBER_INNER_COMPACT"
              :model-value="emptyEd.gridCol ?? ''"
              placeholder="auto"
              @update:model-value="(v: number | string) => patchEmptyDisplay({ gridCol: v !== '' ? Number(v) : undefined })"
            />
          </label>
          <label class="block flex-1">
            <span class="text-[11px] font-medium text-slate-400 block">行</span>
            <EditorNumberInput
              :min="1"
              :class="PROP_NUMBER_WRAP_COMPACT"
              :input-class="PROP_NUMBER_INNER_COMPACT"
              :model-value="emptyEd.gridRow ?? ''"
              placeholder="auto"
              @update:model-value="(v: number | string) => patchEmptyDisplay({ gridRow: v !== '' ? Number(v) : undefined })"
            />
          </label>
        </div>
        <div class="flex gap-1 mb-2">
          <label class="block flex-1">
            <span class="text-[11px] font-medium text-slate-400 block">跨列</span>
            <EditorNumberInput
              :min="1"
              :max="cardGridColsForEmpty"
              :class="PROP_NUMBER_WRAP_COMPACT"
              :input-class="PROP_NUMBER_INNER_COMPACT"
              :model-value="emptyEd.gridColSpan ?? ''"
              placeholder="1"
              @update:model-value="(v: number | string) => patchEmptyDisplay({ gridColSpan: v !== '' ? Number(v) : undefined })"
            />
          </label>
          <label class="block flex-1">
            <span class="text-[11px] font-medium text-slate-400 block">跨行</span>
            <EditorNumberInput
              :min="1"
              :class="PROP_NUMBER_WRAP_COMPACT"
              :input-class="PROP_NUMBER_INNER_COMPACT"
              :model-value="emptyEd.gridRowSpan ?? ''"
              placeholder="1"
              @update:model-value="(v: number | string) => patchEmptyDisplay({ gridRowSpan: v !== '' ? Number(v) : undefined })"
            />
          </label>
        </div>
      </template>
    </template>
  </div>
</template>
