<script setup lang="ts">
import { computed } from 'vue'
import type { ComponentDataFieldsProps } from '../types'
import { PROP_LABEL, PROP_HINT, PROP_INPUT } from '../../propertyPanel/shared'

const props = defineProps<ComponentDataFieldsProps>()

function readFilterValues(): string[] {
  const raw = props.comp.props.filterValues
  if (!Array.isArray(raw)) return []
  return raw.map((v) => String(v))
}

const filterField = computed(() => (props.comp.props.filterField as string) ?? '')
const filterValues = computed(() => readFilterValues())

function setFilterField(value: string) {
  props.updateProps({ filterField: value.trim() || undefined })
}

function setFilterValues(values: string[]) {
  props.updateProps({ filterValues: values })
}

function addValue() {
  setFilterValues([...filterValues.value, ''])
}

function removeValue(idx: number) {
  const next = [...filterValues.value]
  next.splice(idx, 1)
  setFilterValues(next)
}

function updateValue(idx: number, value: string) {
  const next = [...filterValues.value]
  next[idx] = value
  setFilterValues(next)
}

const categoryFieldHint = computed(() => {
  const cf = (props.comp.props.categoryField as string) ?? ''
  return cf || 'name / KEY'
})
</script>

<template>
  <div class="border-t border-white/10 pt-3 space-y-3">
    <div>
      <span :class="PROP_LABEL">数据过滤</span>
      <p :class="[PROP_HINT, 'mt-1']">
        对数组数据按指定字段筛选行；不配置过滤值则显示全部。饼图百分比基于过滤后的数据重新计算。
      </p>
    </div>

    <label class="block">
      <span :class="PROP_LABEL">过滤字段</span>
      <input
        :class="[PROP_INPUT, 'mt-1 font-mono']"
        :placeholder="`如 ${categoryFieldHint}`"
        :value="filterField"
        @change="setFilterField(($event.target as HTMLInputElement).value)"
      />
      <p :class="[PROP_HINT, 'mt-1']">数组元素中用于匹配的 KEY，如 NAME、city。</p>
    </label>

    <div>
      <div class="flex items-center justify-between mb-1.5">
        <span :class="PROP_LABEL">过滤值</span>
        <button
          type="button"
          class="text-[11px] text-indigo-400 hover:text-indigo-300"
          @click="addValue"
        >
          + 添加
        </button>
      </div>
      <p :class="PROP_HINT">
        仅保留该字段等于下列任一项的数据行；留空表示不过滤。
      </p>
      <p v-if="filterValues.length === 0" :class="[PROP_HINT, 'mt-1']">未配置，显示全部数据。</p>
      <div v-else class="flex flex-col gap-1.5 mt-2">
        <div
          v-for="(val, idx) in filterValues"
          :key="idx"
          class="flex items-center gap-1"
        >
          <input
            class="flex-1 min-w-0 h-7 box-border rounded border border-white/15 bg-white/[0.08] px-2 py-0 text-xs text-slate-100 placeholder:text-slate-500"
            placeholder="如：北京"
            :value="val"
            @change="updateValue(idx, ($event.target as HTMLInputElement).value)"
          />
          <button
            type="button"
            class="flex h-7 w-7 shrink-0 items-center justify-center p-0 text-base leading-none text-red-400/60 hover:text-red-400"
            title="删除"
            @click="removeValue(idx)"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
