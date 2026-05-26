<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { CardFieldConfig, CardFieldLayoutId, CardEmptyDisplayConfig, IconDictEntry } from '@mvp-vue/schema'
import {
  CARD_FIELD_LAYOUTS,
  DATE_FORMAT_PRESETS,
  DEFAULT_CARD_TAG_SEPARATOR,
  CARD_TAG_BG_COLOR_DICT_VALUE,
  isCardFieldVisible,
} from '@mvp-vue/schema'
import { useEditorStore } from '../../../stores/editorStore'
import { storeToRefs } from 'pinia'
import { autoImportCardFieldsFromApi, hasConfiguredCardFields } from '../../../cardFieldAutoImport'
import ColorSwatch from '../../ColorSwatch.vue'
import ColorField from '../../ColorField.vue'
import EditorNumberInput from '../../EditorNumberInput.vue'
import ConfirmDialog from '../../ConfirmDialog.vue'
import ComponentPropsJsonDialog from '../../ComponentPropsJsonDialog.vue'
import IconPickerModal from '../../IconPickerModal.vue'
import CardListEmptyDisplaySection from './CardListEmptyDisplaySection.vue'
import type { ComponentPropertyFieldsProps } from '../types'
import {
  PROP_LABEL,
  PROP_HINT,
  PROP_INPUT,
  PROP_NUMBER_WRAP,
  PROP_NUMBER_INNER,
  PROP_NUMBER_WRAP_COMPACT,
  PROP_NUMBER_INNER_COMPACT,
  PROP_SELECT_COMPACT,
} from '../../propertyPanel/shared'

const props = defineProps<ComponentPropertyFieldsProps>()

const store = useEditorStore()
const { iconDict } = storeToRefs(store)

const cardFieldImporting = ref(false)
const cardFieldImportErr = ref('')
const cardFieldImportConfirm = ref<{ count: number } | null>(null)
const propsJsonDialog = ref<'export' | 'import' | null>(null)
const emptyIconPickerOpen = ref(false)
const emptyIconSearch = ref('')
const emptyIconPickerTab = ref<'preset' | 'custom'>('preset')
const emptyIconCustomSvg = ref('')
const showOnlyVisibleFields = ref(false)

watch(() => props.comp.id, () => {
  cardFieldImportErr.value = ''
  cardFieldImportConfirm.value = null
  propsJsonDialog.value = null
  emptyIconPickerOpen.value = false
  showOnlyVisibleFields.value = false
})

function getEmptyDisplay(): CardEmptyDisplayConfig {
  return (props.comp.props.emptyDisplay as CardEmptyDisplayConfig) ?? {
    enabled: false,
    watchFields: [],
    watchMode: 'any',
    retainFields: [],
  }
}

function patchEmptyDisplay(patch: Partial<CardEmptyDisplayConfig>) {
  const cur = getEmptyDisplay()
  props.updateProps({ emptyDisplay: { ...cur, ...patch } })
}

function emptyDisplayIconEntry(): IconDictEntry {
  const ed = getEmptyDisplay()
  if (ed.iconType && (ed.iconName || ed.iconSvg)) {
    return { id: 'empty-inline', key: '', iconType: ed.iconType, iconName: ed.iconName, iconSvg: ed.iconSvg }
  }
  return { id: 'empty-inline', key: '', iconType: 'preset', iconName: 'tabler:box-off' }
}

function toggleEmptyFieldList(listKey: 'watchFields' | 'retainFields', fieldName: string, checked: boolean) {
  const cur = getEmptyDisplay()
  const set = new Set(cur[listKey] ?? [])
  if (checked) set.add(fieldName)
  else set.delete(fieldName)
  patchEmptyDisplay({ [listKey]: [...set] })
}

async function runCardFieldImport() {
  cardFieldImporting.value = true
  cardFieldImportErr.value = ''
  try {
    const fields = await autoImportCardFieldsFromApi({
      apiUrl: (props.comp.props.apiUrl as string) ?? '',
      fixedParams: (props.comp.props.fixedParams as Record<string, string>) ?? {},
      dataListPath: (props.comp.props.dataListPath as string) ?? 'data.list',
    })
    props.updateProps({ fields })
    cardFieldImportConfirm.value = null
  } catch (err) {
    cardFieldImportErr.value = err instanceof Error ? err.message : '导入失败'
  } finally {
    cardFieldImporting.value = false
  }
}

const allFields = computed(() => (props.comp.props.fields as CardFieldConfig[]) ?? [])

const visibleIndices = computed(() =>
  allFields.value
    .map((f, i) => (isCardFieldVisible(f) ? i : -1))
    .filter((i) => i >= 0),
)

const fieldEntries = computed(() => {
  if (showOnlyVisibleFields.value) {
    return visibleIndices.value.map((idx) => ({ f: allFields.value[idx]!, idx }))
  }
  return allFields.value.map((f, idx) => ({ f, idx }))
})

const hiddenCount = computed(() => allFields.value.filter((f) => !isCardFieldVisible(f)).length)

const cardGridColsVal = computed(() => (props.comp.props.cardGridCols as number) ?? 1)

function onImportClick() {
  const existing = (props.comp.props.fields as CardFieldConfig[]) ?? []
  if (hasConfiguredCardFields(existing)) {
    cardFieldImportConfirm.value = {
      count: existing.filter((f) => f.field.trim()).length,
    }
    return
  }
  void runCardFieldImport()
}

function addField() {
  const f = [...((props.comp.props.fields as CardFieldConfig[]) ?? [])]
  f.push({ field: '', label: '' })
  props.updateProps({ fields: f })
}

function removeField(idx: number) {
  const arr = [...((props.comp.props.fields as CardFieldConfig[]) ?? [])]
  arr.splice(idx, 1)
  props.updateProps({ fields: arr })
}

function updateField(idx: number, patch: Partial<CardFieldConfig>) {
  const arr = [...((props.comp.props.fields as CardFieldConfig[]) ?? [])]
  arr[idx] = { ...arr[idx]!, ...patch }
  props.updateProps({ fields: arr })
}

function moveField(entryIdx: number, dir: -1 | 1) {
  const all = allFields.value
  let target: number
  if (showOnlyVisibleFields.value) {
    const pos = visibleIndices.value.indexOf(entryIdx)
    const nextPos = pos + dir
    if (nextPos < 0 || nextPos >= visibleIndices.value.length) return
    target = visibleIndices.value[nextPos]!
  } else {
    target = entryIdx + dir
    if (target < 0 || target >= all.length) return
  }
  const fields = [...all]
  ;[fields[entryIdx], fields[target]] = [fields[target]!, fields[entryIdx]!]
  props.updateProps({ fields })
}

function openEmptyIconPicker() {
  const entry = emptyDisplayIconEntry()
  emptyIconSearch.value = ''
  emptyIconPickerTab.value = entry.iconType === 'custom' ? 'custom' : 'preset'
  emptyIconCustomSvg.value = entry.iconSvg ?? ''
  emptyIconPickerOpen.value = true
}
</script>

<template>
  <div class="flex flex-col gap-2.5">
    <!-- Import / Export JSON -->
    <div class="flex items-center gap-2 pb-1 border-b border-white/10">
      <button
        type="button"
        class="flex-1 text-[11px] py-1.5 rounded border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/10 hover:text-slate-100 transition-colors"
        @click="propsJsonDialog = 'export'"
      >导出属性 JSON</button>
      <button
        type="button"
        class="flex-1 text-[11px] py-1.5 rounded border border-indigo-400/25 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 transition-colors"
        @click="propsJsonDialog = 'import'"
      >导入属性 JSON</button>
    </div>

    <!-- API URL -->
    <label class="block">
      <span :class="PROP_LABEL">API URL</span>
      <input
        :class="PROP_INPUT"
        placeholder="http://..."
        :value="(comp.props.apiUrl as string) ?? ''"
        @input="props.updateProps({ apiUrl: ($event.target as HTMLInputElement).value })"
      />
    </label>

    <!-- Fixed params -->
    <div class="border-t border-white/10 pt-2">
      <div class="flex items-center justify-between mb-1.5">
        <span :class="PROP_LABEL">固定参数</span>
        <button
          class="text-[11px] text-indigo-400 hover:text-indigo-300"
          @click="() => {
            const params = { ...(comp.props.fixedParams as Record<string, string>) ?? {} }
            params[''] = ''
            props.updateProps({ fixedParams: params })
          }"
        >+ 添加</button>
      </div>
      <div
        v-for="([key, val], idx) in Object.entries((comp.props.fixedParams as Record<string, string>) ?? {})"
        :key="idx"
        class="flex gap-1 mb-1"
      >
        <input
          class="flex-1 min-w-0 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
          placeholder="key"
          :value="key"
          @input="(e) => {
            const params = { ...(comp.props.fixedParams as Record<string, string>) ?? {} }
            const v = params[key]
            delete params[key]
            params[(e.target as HTMLInputElement).value] = v ?? ''
            props.updateProps({ fixedParams: params })
          }"
        />
        <input
          class="flex-1 min-w-0 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
          placeholder="value"
          :value="val"
          @input="(e) => {
            const params = { ...(comp.props.fixedParams as Record<string, string>) ?? {} }
            params[key] = (e.target as HTMLInputElement).value
            props.updateProps({ fixedParams: params })
          }"
        />
        <button
          class="text-red-400/60 hover:text-red-400 text-[10px] px-0.5 shrink-0"
          @click="() => {
            const params = { ...(comp.props.fixedParams as Record<string, string>) ?? {} }
            delete params[key]
            props.updateProps({ fixedParams: params })
          }"
        >&times;</button>
      </div>
    </div>

    <!-- Pagination settings -->
    <div class="border-t border-white/10 pt-2" />
    <label class="block">
      <span :class="PROP_LABEL">每页条数</span>
      <EditorNumberInput
        :min="1" :max="100"
        :class="PROP_NUMBER_WRAP"
		:input-class="PROP_NUMBER_INNER"
        :model-value="(comp.props.pageSize as number) ?? 10"
        @update:model-value="(v: number) => props.updateProps({ pageSize: v })"
      />
    </label>
    <label class="block">
      <span :class="PROP_LABEL">翻页间隔（秒）</span>
      <p class="text-[10px] text-slate-500 mt-0.5 leading-snug">
        多屏时数据在轮播回到第一页时自动刷新；仅 1 屏时按此间隔定时刷新
      </p>
      <EditorNumberInput
        :min="0" :max="300"
        :class="PROP_NUMBER_WRAP"
		:input-class="PROP_NUMBER_INNER"
        :model-value="(comp.props.pageFlipInterval as number) ?? 10"
        @update:model-value="(v: number) => props.updateProps({ pageFlipInterval: v })"
      />
    </label>
    <label class="block">
      <span :class="PROP_LABEL">数据刷新间隔（秒，0=不刷新；仅翻页间隔为 0 时生效）</span>
      <EditorNumberInput
        :min="0" :max="3600"
        :class="PROP_NUMBER_WRAP"
		:input-class="PROP_NUMBER_INNER"
        :model-value="(comp.props.refreshInterval as number) ?? 0"
        @update:model-value="(v: number) => props.updateProps({ refreshInterval: v })"
      />
    </label>

    <!-- Data paths -->
    <div class="border-t border-white/10 pt-2" />
    <label class="block">
      <span :class="PROP_LABEL">列表路径 (JSONPath)</span>
      <input
        class="w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 font-mono focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
        placeholder="data.list"
        :value="(comp.props.dataListPath as string) ?? 'data.list'"
        @input="props.updateProps({ dataListPath: ($event.target as HTMLInputElement).value })"
      />
    </label>
    <label class="block">
      <span :class="PROP_LABEL">总数路径 (JSONPath)</span>
      <input
        class="w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 font-mono focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
        placeholder="data.total"
        :value="(comp.props.dataTotalPath as string) ?? 'data.total'"
        @input="props.updateProps({ dataTotalPath: ($event.target as HTMLInputElement).value })"
      />
    </label>

    <!-- Grid layout -->
    <div class="border-t border-white/10 pt-2" />
    <div class="flex gap-2 mb-2">
      <label class="block flex-1">
        <span :class="PROP_LABEL">列数</span>
        <EditorNumberInput
          :min="1" :max="20"
          :class="PROP_NUMBER_WRAP"
		:input-class="PROP_NUMBER_INNER"
          :model-value="(comp.props.cols as number) ?? 5"
          @update:model-value="(v: number) => props.updateProps({ cols: v })"
        />
      </label>
      <label class="block flex-1">
        <span :class="PROP_LABEL">行数</span>
        <EditorNumberInput
          :min="1" :max="20"
          :class="PROP_NUMBER_WRAP"
		:input-class="PROP_NUMBER_INNER"
          :model-value="(comp.props.rows as number) ?? 2"
          @update:model-value="(v: number) => props.updateProps({ rows: v })"
        />
      </label>
    </div>
    <div class="flex gap-2">
      <label class="block flex-1">
        <span :class="PROP_LABEL">间距</span>
        <EditorNumberInput
          :min="0" :max="100"
          :class="PROP_NUMBER_WRAP"
		:input-class="PROP_NUMBER_INNER"
          :model-value="(comp.props.gap as number) ?? 12"
          @update:model-value="(v: number) => props.updateProps({ gap: v })"
        />
      </label>
      <div class="flex-1" />
    </div>

    <!-- Card internal grid -->
    <div class="border-t border-white/10 pt-2" />
    <span :class="PROP_LABEL">卡片内部网格</span>
    <div class="flex gap-2 mt-1 mb-2">
      <label class="block flex-1">
        <span class="text-[11px] text-slate-400">列数</span>
        <EditorNumberInput
          :min="1" :max="24"
          :class="PROP_NUMBER_WRAP_COMPACT"
		:input-class="PROP_NUMBER_INNER_COMPACT"
          :model-value="(comp.props.cardGridCols as number) ?? 1"
          @update:model-value="(v: number) => props.updateProps({ cardGridCols: v })"
        />
      </label>
      <label class="block flex-1">
        <span class="text-[11px] text-slate-400">行数</span>
        <EditorNumberInput
          :min="1" :max="24"
          :class="PROP_NUMBER_WRAP_COMPACT"
		:input-class="PROP_NUMBER_INNER_COMPACT"
          placeholder="自动"
          :model-value="(comp.props.cardGridRows as number) ?? ''"
          @update:model-value="(v: number | string) => props.updateProps({ cardGridRows: v === '' ? undefined : Number(v) })"
        />
      </label>
    </div>
    <div class="flex gap-2">
      <label class="block flex-1">
        <span class="text-[11px] text-slate-400">水平间距</span>
        <EditorNumberInput
          :min="0" :max="40"
          :class="PROP_NUMBER_WRAP_COMPACT"
		:input-class="PROP_NUMBER_INNER_COMPACT"
          :model-value="(comp.props.cardGridColumnGap as number) ?? (comp.props.cardGridGap as number) ?? 8"
          @update:model-value="(v: number) => props.updateProps({ cardGridColumnGap: v })"
        />
      </label>
      <label class="block flex-1">
        <span class="text-[11px] text-slate-400">垂直间距</span>
        <EditorNumberInput
          :min="0" :max="40"
          :class="PROP_NUMBER_WRAP_COMPACT"
		:input-class="PROP_NUMBER_INNER_COMPACT"
          :model-value="(comp.props.cardGridRowGap as number) ?? (comp.props.cardGridGap as number) ?? 8"
          @update:model-value="(v: number) => props.updateProps({ cardGridRowGap: v })"
        />
      </label>
    </div>

    <!-- Card styling -->
    <div class="border-t border-white/10 pt-2" />
    <ColorField
      label="卡片背景色"
      :value="(comp.props.cardBgColor as string) ?? 'rgba(15,24,36,0.85)'"
      @change="(v: string) => props.updateProps({ cardBgColor: v })"
    />
    <ColorField
      label="卡片边框色"
      :value="(comp.props.cardBorderColor as string) ?? '#1e293b'"
      @change="(v: string) => props.updateProps({ cardBorderColor: v })"
    />
    <label class="block">
      <span :class="PROP_LABEL">卡片圆角</span>
      <EditorNumberInput
        :min="0" :max="40"
        :class="PROP_NUMBER_WRAP"
		:input-class="PROP_NUMBER_INNER"
        :model-value="(comp.props.cardBorderRadius as number) ?? 8"
        @update:model-value="(v: number) => props.updateProps({ cardBorderRadius: v })"
      />
    </label>

    <!-- Empty display -->
    <CardListEmptyDisplaySection
      :comp="comp"
      :icon-dict="iconDict"
      @update:empty-display="patchEmptyDisplay"
      @toggle-field="(listKey, fieldName, checked) => toggleEmptyFieldList(listKey, fieldName, checked)"
      @open-icon-picker="openEmptyIconPicker"
    />

    <!-- Fields config -->
    <div class="border-t border-white/10 pt-2">
      <div class="flex items-center justify-between mb-1.5">
        <span :class="PROP_LABEL">卡片字段</span>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="text-[11px] text-emerald-400 hover:text-emerald-300 disabled:opacity-40"
            :disabled="cardFieldImporting || !(comp.props.apiUrl as string)?.trim()"
            :title="!(comp.props.apiUrl as string)?.trim() ? '请先填写 API URL' : undefined"
            @click="onImportClick"
          >
            {{ cardFieldImporting ? '导入中…' : '从 API 导入' }}
          </button>
          <button
            type="button"
            class="text-[11px] text-indigo-400 hover:text-indigo-300"
            @click="addField"
          >+ 添加</button>
        </div>
      </div>
      <p :class="[PROP_HINT, 'mb-1.5 leading-relaxed']">
        按当前 API、固定参数与列表路径请求第 1 页数据，从首条记录推断字段（标签默认与字段名相同）。
      </p>
      <p v-if="cardFieldImportErr" class="text-[10px] text-red-400 mb-1.5">{{ cardFieldImportErr }}</p>
      <label class="mb-1.5 flex cursor-pointer items-center gap-1.5">
        <input
          type="checkbox"
          class="rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-indigo-400/30"
          v-model="showOnlyVisibleFields"
        />
        <span class="text-[11px] text-slate-400">只显示在卡片中显示的字段</span>
      </label>
      <p v-if="showOnlyVisibleFields && hiddenCount > 0" :class="[PROP_HINT, 'mb-1.5']">
        已隐藏 {{ hiddenCount }} 个未在卡片中显示的字段
      </p>

      <!-- Field entries -->
      <div
        v-for="({ f, idx }) in fieldEntries"
        :key="idx"
        class="mb-2.5 rounded-md border p-2.5"
        :class="idx % 2 === 0 ? 'border-white/15 bg-white/[0.14]' : 'border-white/5 bg-indigo-950/55'"
      >
        <!-- Field name + label row -->
        <div class="mb-2 border-b border-white/10 pb-2">
          <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_3rem] items-end gap-1">
            <label class="block min-w-0">
              <span :class="[PROP_LABEL, 'text-indigo-200 mb-1 block']">字段名</span>
              <input
                class="w-full rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-xs font-semibold text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
                placeholder="如 title"
                :value="f.field"
                @input="updateField(idx, { field: ($event.target as HTMLInputElement).value })"
              />
            </label>
            <label class="block min-w-0">
              <span :class="[PROP_LABEL, 'normal-case text-slate-400 mb-1 block']">显示标签</span>
              <input
                class="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
                placeholder="如 标题"
                :value="f.label"
                @input="updateField(idx, { label: ($event.target as HTMLInputElement).value })"
              />
            </label>
            <div class="flex shrink-0 items-center gap-0 self-end pb-1">
              <button
                type="button"
                class="flex h-7 w-4 items-center justify-center p-0 text-xs leading-none text-slate-500 hover:text-slate-200 disabled:cursor-default disabled:opacity-20"
                :disabled="!showOnlyVisibleFields ? idx <= 0 : !(visibleIndices.indexOf(idx) > 0)"
                @click="moveField(idx, -1)"
                title="上移"
              >▲</button>
              <button
                type="button"
                class="flex h-7 w-4 items-center justify-center p-0 text-xs leading-none text-slate-500 hover:text-slate-200 disabled:cursor-default disabled:opacity-20"
                :disabled="!showOnlyVisibleFields ? idx >= allFields.length - 1 : !(visibleIndices.indexOf(idx) < visibleIndices.length - 1)"
                @click="moveField(idx, 1)"
                title="下移"
              >▼</button>
              <button
                type="button"
                class="flex h-7 w-4 items-center justify-center p-0 text-xs leading-none text-red-400/70 hover:text-red-400"
                @click="removeField(idx)"
              >&times;</button>
            </div>
          </div>
        </div>

        <!-- Visible checkbox -->
        <label class="mb-1.5 flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            class="rounded border-white/20 bg-white/10 text-indigo-500 focus:ring-indigo-400/30"
            :checked="f.visible !== false"
            @change="updateField(idx, { visible: ($event.target as HTMLInputElement).checked ? undefined : false })"
          />
          <span class="text-[11px] text-slate-400">在卡片中显示</span>
        </label>

        <!-- Layout selector -->
        <label class="block mb-1">
          <span class="text-[11px] font-medium text-slate-400 block">字段布局</span>
          <select
            :class="PROP_SELECT_COMPACT"
            :value="f.layoutId ?? 'default'"
            @change="updateField(idx, { layoutId: ($event.target as HTMLSelectElement).value as CardFieldLayoutId })"
          >
            <option v-for="l in CARD_FIELD_LAYOUTS" :key="l.id" :value="l.id">{{ l.label }}</option>
          </select>
        </label>

        <!-- Grid position (if multi-col) -->
        <template v-if="cardGridColsVal > 1">
          <p class="text-[9px] text-slate-500 mb-1 leading-relaxed">
            字段按列表顺序自动从左到右排列，满 {{ cardGridColsVal }} 列后换行；调序只改变先后，不钉死格子。
          </p>
          <div class="flex gap-1 mb-1">
            <label class="block flex-1">
              <span class="text-[11px] font-medium text-slate-400 block">跨列</span>
              <EditorNumberInput
                :min="1" :max="cardGridColsVal"
                :class="PROP_NUMBER_WRAP_COMPACT"
		:input-class="PROP_NUMBER_INNER_COMPACT"
                :model-value="f.gridColSpan ?? ''"
                placeholder="1"
                @update:model-value="(v: number | string) => updateField(idx, { gridColSpan: v ? Number(v) : undefined })"
              />
            </label>
            <label class="block flex-1">
              <span class="text-[11px] font-medium text-slate-400 block">跨行</span>
              <EditorNumberInput
                :min="1"
                :class="PROP_NUMBER_WRAP_COMPACT"
		:input-class="PROP_NUMBER_INNER_COMPACT"
                :model-value="f.gridRowSpan ?? ''"
                placeholder="1"
                @update:model-value="(v: number | string) => updateField(idx, { gridRowSpan: v ? Number(v) : undefined })"
              />
            </label>
          </div>
        </template>

        <!-- fontSize + fontWeight -->
        <div class="flex gap-1 items-start mb-1">
          <div class="flex-1">
            <span class="text-[11px] font-medium text-slate-400 block">字号</span>
            <input
              class="w-full mt-0.5 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500"
              placeholder="14px"
              :value="f.fontSize ?? ''"
              @input="updateField(idx, { fontSize: ($event.target as HTMLInputElement).value || undefined })"
            />
          </div>
          <div class="flex-1">
            <span class="text-[11px] font-medium text-slate-400 block">粗细</span>
            <select
              :class="[PROP_SELECT_COMPACT, 'focus:ring-1 focus:ring-indigo-400/30']"
              :value="f.fontWeight ?? ''"
              @change="updateField(idx, { fontWeight: (($event.target as HTMLSelectElement).value || undefined) as CardFieldConfig['fontWeight'] })"
            >
              <option value="">默认</option>
              <option value="normal">常规</option>
              <option value="bold">粗体</option>
            </select>
          </div>
        </div>

        <!-- textColor + bgColor -->
        <div class="flex gap-1 items-start mb-1">
          <div class="flex-1">
            <span class="text-[11px] font-medium text-slate-400 block">文字色</span>
            <div class="flex gap-1 mt-0.5">
              <ColorSwatch
                class="w-8 h-8 shrink-0 border border-white/10"
                :value="f.textColor ?? '#cbd5e1'"
                @change="(textColor: string) => updateField(idx, { textColor })"
              />
              <input
                class="w-0 flex-1 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 font-mono min-w-0"
                :value="f.textColor ?? ''"
                placeholder="#cbd5e1"
                @input="updateField(idx, { textColor: ($event.target as HTMLInputElement).value || undefined })"
              />
            </div>
          </div>
          <div class="flex-1">
            <span class="text-[11px] font-medium text-slate-400 block">底色</span>
            <div class="flex gap-1 mt-0.5">
              <ColorSwatch
                class="w-8 h-8 shrink-0 border border-white/10"
                :value="f.bgColor ?? '#000000'"
                @change="(bgColor: string) => updateField(idx, { bgColor })"
              />
              <input
                class="w-0 flex-1 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 font-mono min-w-0"
                :value="f.bgColor ?? ''"
                placeholder="#000 或 DICT:字段名"
                @input="updateField(idx, { bgColor: ($event.target as HTMLInputElement).value || undefined })"
              />
            </div>
          </div>
        </div>

        <!-- textAlign -->
        <label class="block flex-1 mb-1">
          <span class="text-[11px] font-medium text-slate-400 block">对齐</span>
          <select
            :class="[PROP_SELECT_COMPACT, 'focus:ring-1 focus:ring-indigo-400/30']"
            :value="f.textAlign ?? ''"
            @change="updateField(idx, { textAlign: (($event.target as HTMLSelectElement).value || undefined) as CardFieldConfig['textAlign'] })"
          >
            <option value="">默认</option>
            <option value="left">← 左</option>
            <option value="center">◼ 中</option>
            <option value="right">→ 右</option>
          </select>
        </label>

        <!-- date format -->
        <label class="block">
          <span class="text-[11px] font-medium text-slate-400 block">日期格式</span>
          <select
            :class="[PROP_SELECT_COMPACT, 'focus:ring-1 focus:ring-indigo-400/30']"
            :value="f.dateFormat ?? ''"
            @change="updateField(idx, { dateFormat: ($event.target as HTMLSelectElement).value || undefined })"
          >
            <option value="">不转换</option>
            <option v-for="p in DATE_FORMAT_PRESETS" :key="p.value" :value="p.value">{{ p.label }}</option>
          </select>
        </label>

        <!-- abbrev dict -->
        <label class="flex items-center gap-2 mb-1 cursor-pointer">
          <input
            type="checkbox"
            class="rounded border-white/20"
            :checked="f.abbrevDictEnabled === true"
            @change="updateField(idx, { abbrevDictEnabled: ($event.target as HTMLInputElement).checked || undefined })"
          />
          <span class="text-[11px] font-medium text-slate-400">匹配缩略语字典</span>
        </label>
        <p v-if="f.abbrevDictEnabled" class="text-[9px] text-slate-500 mb-1 -mt-0.5">
          字段值与页面缩略语字典 KEY 精确匹配时显示缩略语，否则显示原值
        </p>

        <!-- value display mode -->
        <label class="block">
          <span class="text-[11px] font-medium text-slate-400 block">值显示方式</span>
          <select
            :class="[PROP_SELECT_COMPACT, 'focus:ring-1 focus:ring-indigo-400/30']"
            :value="f.valueDisplay ?? 'text'"
            @change="updateField(idx, { valueDisplay: (($event.target as HTMLSelectElement).value as 'text' | 'icon') || undefined })"
          >
            <option value="text">原始值</option>
            <option value="icon">图标</option>
          </select>
        </label>

        <!-- tag split -->
        <label class="flex items-center gap-2 mb-1 cursor-pointer">
          <input
            type="checkbox"
            class="rounded border-white/20"
            :checked="f.tagSplitEnabled === true"
            @change="(e) => {
              const checked = (e.target as HTMLInputElement).checked
              updateField(idx, {
                tagSplitEnabled: checked || undefined,
                tagSeparator: checked ? (f.tagSeparator ?? DEFAULT_CARD_TAG_SEPARATOR) : undefined,
                tagBgColor: checked
                  ? (f.tagBgColor === 'DICT' || !f.tagBgColor ? CARD_TAG_BG_COLOR_DICT_VALUE : f.tagBgColor)
                  : undefined,
              })
            }"
          />
          <span class="text-[11px] font-medium text-slate-400">Tag 切分展示</span>
        </label>
        <template v-if="f.tagSplitEnabled">
          <label class="block mb-1">
            <span class="text-[11px] font-medium text-slate-400 block">切分字符</span>
            <input
              :class="PROP_INPUT"
              :placeholder="DEFAULT_CARD_TAG_SEPARATOR"
              :value="f.tagSeparator ?? DEFAULT_CARD_TAG_SEPARATOR"
              @input="updateField(idx, { tagSeparator: ($event.target as HTMLInputElement).value || DEFAULT_CARD_TAG_SEPARATOR })"
            />
          </label>
          <label class="block">
            <span class="text-[11px] font-medium text-slate-400 block">Tag 底色</span>
            <input
              :class="PROP_INPUT"
              :placeholder="CARD_TAG_BG_COLOR_DICT_VALUE"
              :value="f.tagBgColor === 'DICT' || !f.tagBgColor ? CARD_TAG_BG_COLOR_DICT_VALUE : f.tagBgColor"
              @input="updateField(idx, { tagBgColor: ($event.target as HTMLInputElement).value.trim() || CARD_TAG_BG_COLOR_DICT_VALUE })"
            />
            <p class="text-[9px] text-slate-500 mt-0.5">
              {{ CARD_TAG_BG_COLOR_DICT_VALUE }}：每个 tag 用切分后的文字查颜色字典（如「青霉素」「黄瓜」）；或填 #334155 等固定色
            </p>
          </label>
        </template>
      </div>
    </div>
  </div>

  <!-- Dialogs -->
  <ComponentPropsJsonDialog
    :open="propsJsonDialog !== null"
    :mode="propsJsonDialog ?? 'export'"
    :title="propsJsonDialog === 'import' ? '导入 card-list 属性' : '导出 card-list 属性'"
    :props="comp.props"
    @close="propsJsonDialog = null"
    @import="(nextProps) => { store.replaceComponentProps(comp.id, nextProps); propsJsonDialog = null }"
  />

  <ConfirmDialog
    :open="cardFieldImportConfirm !== null"
    title="覆盖已有字段？"
    tone="warning"
    confirm-label="继续导入"
    :loading="cardFieldImporting"
    @cancel="() => { if (!cardFieldImporting) cardFieldImportConfirm = null }"
    @confirm="runCardFieldImport"
  >
    <p>
      已存在
      <span class="font-medium text-amber-200">{{ cardFieldImportConfirm?.count ?? 0 }}</span>
      个手动配置的字段。
    </p>
    <p class="mt-2">
      自动导入将根据 API 首条数据生成字段列表，并
      <span class="text-slate-200">覆盖</span>
      当前全部字段配置。
    </p>
  </ConfirmDialog>

  <IconPickerModal
    v-if="emptyIconPickerOpen"
    :entry="emptyDisplayIconEntry()"
    :search="emptyIconSearch"
    :picker-tab="emptyIconPickerTab"
    :custom-svg-input="emptyIconCustomSvg"
    @update:search="emptyIconSearch = $event"
    @update:picker-tab="emptyIconPickerTab = $event"
    @update:custom-svg-input="emptyIconCustomSvg = $event"
    @confirm="(updated) => {
      patchEmptyDisplay({
        iconDictKey: undefined,
        iconType: updated.iconType,
        iconName: updated.iconName,
        iconSvg: updated.iconSvg,
      })
      emptyIconPickerOpen = false
    }"
    @cancel="emptyIconPickerOpen = false"
  />
</template>
