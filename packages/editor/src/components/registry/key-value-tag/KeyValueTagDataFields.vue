<script setup lang="ts">
import { computed } from 'vue'
import { PROP_LABEL, PROP_HINT, PROP_NUMBER_WRAP, PROP_NUMBER_INNER } from '../../propertyPanel/shared'
import type { ComponentDataFieldsProps } from '../types'
import EditorNumberInput from '../../EditorNumberInput.vue'

const props = defineProps<ComponentDataFieldsProps>()

function stringKeyList(prop: 'visibleKeys' | 'hiddenKeys'): string[] {
  const raw = props.comp.props[prop]
  if (!Array.isArray(raw)) return []
  return raw.map((k) => String(k))
}

function visibleKeysList(): string[] {
  return stringKeyList('visibleKeys')
}

function hiddenKeysList(): string[] {
  return stringKeyList('hiddenKeys')
}

function keyWidthsMap(): Record<string, number> {
  const raw = props.comp.props.keyWidths
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'number' && v > 0) out[k] = Math.round(v)
  }
  return out
}

const visibleKeys = computed(() => visibleKeysList())
const hiddenKeys = computed(() => hiddenKeysList())
const itemEqualWidth = computed(() => props.comp.props.itemEqualWidth === true)

function setVisibleKeys(keys: string[]) {
  props.updateProps({ visibleKeys: keys })
}

function setHiddenKeys(keys: string[]) {
  props.updateProps({ hiddenKeys: keys })
}

function setKeyWidths(widths: Record<string, number>) {
  props.updateProps({ keyWidths: widths })
}

function addKey() {
  setVisibleKeys([...visibleKeys.value, ''])
}

function removeKey(idx: number) {
  const next = [...visibleKeys.value]
  const removed = next[idx]
  next.splice(idx, 1)
  const widths = { ...keyWidthsMap() }
  if (removed) delete widths[removed]
  props.updateProps({ visibleKeys: next, keyWidths: widths })
}

function updateKey(idx: number, value: string) {
  const next = [...visibleKeys.value]
  const oldKey = next[idx]
  next[idx] = value
  const widths = { ...keyWidthsMap() }
  if (oldKey && oldKey !== value && oldKey in widths) {
    widths[value] = widths[oldKey]!
    delete widths[oldKey]
  }
  props.updateProps({ visibleKeys: next, keyWidths: widths })
}

function keyWidthFor(key: string): number {
  return keyWidthsMap()[key] ?? 0
}

function updateKeyWidth(key: string, px: number) {
  const widths = { ...keyWidthsMap() }
  if (px > 0) widths[key] = Math.round(px)
  else delete widths[key]
  setKeyWidths(widths)
}

function moveKey(idx: number, dir: -1 | 1) {
  const next = [...visibleKeys.value]
  const target = idx + dir
  if (target < 0 || target >= next.length) return
  ;[next[idx], next[target]] = [next[target]!, next[idx]!]
  setVisibleKeys(next)
}

function addHiddenKey() {
  setHiddenKeys([...hiddenKeys.value, ''])
}

function removeHiddenKey(idx: number) {
  const next = [...hiddenKeys.value]
  next.splice(idx, 1)
  setHiddenKeys(next)
}

function updateHiddenKey(idx: number, value: string) {
  const next = [...hiddenKeys.value]
  next[idx] = value
  setHiddenKeys(next)
}
</script>

<template>
  <template v-if="dataSourceId && dataSources.length > 0">
    <label class="block">
      <span :class="PROP_LABEL">Key 字段名</span>
      <input
        class="w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
        placeholder="KEY 或 name"
        :value="(comp.props.keyField as string) ?? 'name'"
        @change="props.updateProps({ keyField: ($event.target as HTMLInputElement).value || 'name' })"
      />
    </label>
    <label class="block mt-3">
      <span :class="PROP_LABEL">Value 字段名</span>
      <input
        class="w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
        placeholder="VALUE 或 value"
        :value="(comp.props.valueField as string) ?? 'value'"
        @change="props.updateProps({ valueField: ($event.target as HTMLInputElement).value || 'value' })"
      />
    </label>

    <div class="mt-4 border-t border-white/10 pt-3">
      <div class="flex items-center justify-between mb-1.5">
        <span :class="PROP_LABEL">显示的 KEY</span>
        <button
          type="button"
          class="text-[11px] text-indigo-400 hover:text-indigo-300"
          @click="addKey"
        >+ 添加</button>
      </div>
      <p :class="PROP_HINT">
        留空显示全部；配置后仅显示列表中的 KEY（与接口 KEY 精确匹配），并按下列顺序排列。与「不显示的 KEY」冲突时，以不显示为准。
      </p>
      <p v-if="visibleKeys.length === 0" :class="[PROP_HINT, 'mt-1']">未配置，将显示数据源中的全部项。</p>
      <div v-else class="flex flex-col gap-1.5 mt-2">
        <div
          v-for="(key, idx) in visibleKeys"
          :key="idx"
          class="flex flex-col gap-1"
        >
          <div class="flex items-center gap-1">
            <button
              type="button"
              class="shrink-0 w-5 h-7 text-[10px] text-slate-500 hover:text-slate-300 disabled:opacity-30"
              :disabled="idx === 0"
              title="上移"
              @click="moveKey(idx, -1)"
            >↑</button>
            <button
              type="button"
              class="shrink-0 w-5 h-7 text-[10px] text-slate-500 hover:text-slate-300 disabled:opacity-30"
              :disabled="idx === visibleKeys.length - 1"
              title="下移"
              @click="moveKey(idx, 1)"
            >↓</button>
            <input
              class="flex-1 min-w-0 h-7 box-border rounded border border-white/15 bg-white/[0.08] px-2 py-0 text-xs text-slate-100 placeholder:text-slate-500"
              placeholder="如：病人总数"
              :value="key"
              @change="updateKey(idx, ($event.target as HTMLInputElement).value)"
            />
            <button
              type="button"
              class="flex h-7 w-7 shrink-0 items-center justify-center p-0 text-base leading-none text-red-400/60 hover:text-red-400"
              title="删除"
              @click="removeKey(idx)"
            >×</button>
          </div>
          <label
            v-if="itemEqualWidth && key.trim()"
            class="flex items-center gap-2 pl-11"
          >
            <span class="text-[10px] text-slate-500 shrink-0 w-14">KEY 列宽</span>
            <EditorNumberInput
              :min="0" :max="800" :step="1"
              :class="`${PROP_NUMBER_WRAP} w-20`"
              :input-class="PROP_NUMBER_INNER"
              :model-value="keyWidthFor(key)"
              @update:model-value="(v: string) => updateKeyWidth(key, Number(v) || 0)"
            />
            <span class="text-[10px] text-slate-600">px，0=等分</span>
          </label>
        </div>
      </div>
    </div>

    <div class="mt-4 border-t border-white/10 pt-3">
      <div class="flex items-center justify-between mb-1.5">
        <span :class="PROP_LABEL">不显示的 KEY</span>
        <button
          type="button"
          class="text-[11px] text-indigo-400 hover:text-indigo-300"
          @click="addHiddenKey"
        >+ 添加</button>
      </div>
      <p :class="PROP_HINT">
        留空不排除任何项；填写后隐藏对应 KEY。若与「显示的 KEY」重复，仍不显示。
      </p>
      <p v-if="hiddenKeys.length === 0" :class="[PROP_HINT, 'mt-1']">未配置，不按 KEY 隐藏。</p>
      <div v-else class="flex flex-col gap-1.5 mt-2">
        <div
          v-for="(key, idx) in hiddenKeys"
          :key="`hidden-${idx}`"
          class="flex items-center gap-1"
        >
          <input
            class="flex-1 min-w-0 h-7 box-border rounded border border-white/15 bg-white/[0.08] px-2 py-0 text-xs text-slate-100 placeholder:text-slate-500"
            placeholder="如：内部备注"
            :value="key"
            @change="updateHiddenKey(idx, ($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center p-0 text-base leading-none text-red-400/60 hover:text-red-400"
            title="删除"
            @click="removeHiddenKey(idx)"
          >×</button>
        </div>
      </div>
    </div>
  </template>
</template>
