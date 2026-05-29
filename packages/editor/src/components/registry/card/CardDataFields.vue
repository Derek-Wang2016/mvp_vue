<script setup lang="ts">
import { computed } from 'vue'
import type { CardArrayFilterCondition, CardArrayFilterOperator } from '@mvp-vue/schema'
import { CARD_ARRAY_FILTER_OPERATORS } from '@mvp-vue/schema'
import type { ComponentDataFieldsProps } from '../types'
import { PROP_LABEL, PROP_HINT, PROP_INPUT } from '../../propertyPanel/shared'
import ImportFieldWhitelistSection from '../shared/ImportFieldWhitelistSection.vue'
/** 编辑态保留空行；导入时再 parseImportFieldWhitelist 去空 */
function readEditableImportFieldWhitelist(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((k) => String(k))
}

const props = defineProps<ComponentDataFieldsProps>()

const boundDs = computed(() =>
  props.dataSourceId ? props.dataSources.find((d) => d.id === props.dataSourceId) : undefined,
)

const filters = computed(() => (props.comp.props.arrayFilters as CardArrayFilterCondition[]) ?? [])

function setFilters(next: CardArrayFilterCondition[]) {
  props.updateProps({ arrayFilters: next })
}

function addFilter() {
  setFilters([...filters.value, { field: '', operator: 'eq', value: '' }])
}

function removeFilter(idx: number) {
  const next = [...filters.value]
  next.splice(idx, 1)
  setFilters(next)
}

function updateFilter(idx: number, patch: Partial<CardArrayFilterCondition>) {
  const next = [...filters.value]
  next[idx] = { ...next[idx]!, ...patch }
  setFilters(next)
}

function needsValue(op: CardArrayFilterOperator): boolean {
  return op !== 'empty' && op !== 'notEmpty'
}

const importWhitelist = computed(() =>
  readEditableImportFieldWhitelist(props.comp.props.importFieldWhitelist),
)

function setImportWhitelist(names: string[]) {
  props.updateProps({ importFieldWhitelist: names })
}
</script>

<template>
  <div class="space-y-3">
    <p v-if="boundDs" :class="PROP_HINT">
      已绑定数据源 <span class="text-slate-300 font-mono">{{ boundDs.id }}</span>（{{ boundDs.type }}），组件内 API URL 不生效。
    </p>
    <p v-else :class="PROP_HINT">未绑定数据源时，请在「属性」Tab 配置 API URL。</p>

    <label class="block">
      <span :class="PROP_LABEL">数据路径</span>
      <input
        :class="[PROP_INPUT, 'font-mono mt-1']"
        placeholder="data"
        :value="(comp.props.dataPath as string) ?? 'data'"
        @input="props.updateProps({ dataPath: ($event.target as HTMLInputElement).value })"
      />
      <p :class="[PROP_HINT, 'mt-1']">指向单条对象或对象数组；数组时可配合下方过滤条件取第一条匹配。</p>
    </label>

    <div class="border-t border-white/10 pt-2">
      <div class="flex items-center justify-between mb-1.5">
        <span :class="PROP_LABEL">数组过滤（AND）</span>
        <button type="button" class="text-[11px] text-indigo-400 hover:text-indigo-300" @click="addFilter">
          + 条件
        </button>
      </div>
      <p :class="[PROP_HINT, 'mb-2']">全部条件满足时取数组中第一条匹配记录；无条件时取数组第一项。</p>

      <div
        v-for="(c, idx) in filters"
        :key="idx"
        class="mb-2 rounded border border-white/10 bg-white/[0.04] p-2 space-y-1.5"
      >
        <div class="flex gap-1">
          <input
            class="flex-1 min-w-0 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100"
            placeholder="字段名"
            :value="c.field"
            @input="updateFilter(idx, { field: ($event.target as HTMLInputElement).value })"
          />
          <button
            type="button"
            class="text-red-400/70 hover:text-red-400 text-xs px-1"
            @click="removeFilter(idx)"
          >
            &times;
          </button>
        </div>
        <select
          class="editor-select w-full bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100"
          :value="c.operator"
          @change="updateFilter(idx, { operator: ($event.target as HTMLSelectElement).value as CardArrayFilterOperator })"
        >
          <option v-for="op in CARD_ARRAY_FILTER_OPERATORS" :key="op.value" :value="op.value">
            {{ op.label }}
          </option>
        </select>
        <input
          v-if="needsValue(c.operator)"
          class="w-full bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100"
          placeholder="比较值"
          :value="c.value ?? ''"
          @input="updateFilter(idx, { value: ($event.target as HTMLInputElement).value })"
        />
      </div>
    </div>

    <ImportFieldWhitelistSection
      :model-value="importWhitelist"
      @update:model-value="setImportWhitelist"
    />
  </div>
</template>
