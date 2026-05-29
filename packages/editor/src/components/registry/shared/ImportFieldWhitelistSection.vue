<script setup lang="ts">
import { computed } from 'vue'
import { PROP_LABEL, PROP_HINT } from '../../propertyPanel/shared'

const props = defineProps<{
  modelValue: string[]
  hint?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string[]]
}>()

const list = computed(() => props.modelValue ?? [])

function emitList(next: string[]) {
  emit('update:modelValue', next)
}

function addField() {
  emitList([...list.value, ''])
}

function removeField(idx: number) {
  const next = [...list.value]
  next.splice(idx, 1)
  emitList(next)
}

function updateField(idx: number, value: string) {
  const next = [...list.value]
  next[idx] = value
  emitList(next)
}
</script>

<template>
  <div class="border-t border-white/10 pt-2">
    <div class="flex items-center justify-between mb-1.5">
      <span :class="PROP_LABEL">字段导入白名单</span>
      <button type="button" class="text-[11px] text-indigo-400 hover:text-indigo-300" @click="addField">
        + 字段
      </button>
    </div>
    <p :class="[PROP_HINT, 'mb-2 leading-snug']">
      {{
        hint ??
          '留空则导入全部（仍受页面数据源白名单约束）；填写后本组件「导入字段」仅导入下列字段名。'
      }}
    </p>
    <div v-if="list.length === 0" class="text-[10px] text-slate-600 italic py-0.5 mb-1">未配置（导入全部）</div>
    <div v-for="(name, idx) in list" :key="idx" class="flex gap-1 mb-1">
      <input
        class="flex-1 min-w-0 bg-white/[0.08] border border-white/15 rounded px-2 py-1.5 text-xs text-slate-100 font-mono"
        placeholder="字段名"
        :value="name"
        @input="updateField(idx, ($event.target as HTMLInputElement).value)"
      />
      <button
        type="button"
        class="text-red-400/70 hover:text-red-400 text-xs px-1"
        @click="removeField(idx)"
      >
        &times;
      </button>
    </div>
  </div>
</template>
