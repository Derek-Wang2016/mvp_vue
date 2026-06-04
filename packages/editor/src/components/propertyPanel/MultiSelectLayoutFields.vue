<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../../stores/editorStore'
import { storeToRefs } from 'pinia'
import { isComponentLocked } from '@mvp-vue/schema'
import EditorNumberInput from '../EditorNumberInput.vue'
import { PROP_LABEL, PROP_HINT, PROP_NUMBER_WRAP, PROP_NUMBER_INNER } from './shared'

const props = defineProps<{
  disabled?: boolean
}>()

const store = useEditorStore()
const { selectedIds, components } = storeToRefs(store)

const editable = computed(() =>
  components.value.filter((c) => selectedIds.value.includes(c.id) && !isComponentLocked(c)),
)

const widthMixed = computed(() => {
  const list = editable.value
  if (list.length === 0) return true
  const w = list[0]!.w
  return list.some((c) => c.w !== w)
})

const heightMixed = computed(() => {
  const list = editable.value
  if (list.length === 0) return true
  const h = list[0]!.h
  return list.some((c) => c.h !== h)
})

const displayW = computed(() => (widthMixed.value ? '' : editable.value[0]?.w ?? ''))
const displayH = computed(() => (heightMixed.value ? '' : editable.value[0]?.h ?? ''))

function applyW(val: string | number) {
  const n = Number(val)
  if (!Number.isFinite(n)) return
  store.setComponentsSize(editable.value.map((c) => c.id), { w: n })
}

function applyH(val: string | number) {
  const n = Number(val)
  if (!Number.isFinite(n)) return
  store.setComponentsSize(editable.value.map((c) => c.id), { h: n })
}
</script>

<template>
  <div v-if="editable.length > 0" class="space-y-2" :class="disabled ? 'opacity-50 pointer-events-none' : ''">
    <p :class="PROP_LABEL">尺寸（批量）</p>
    <div class="grid grid-cols-2 gap-2">
      <label class="block min-w-0">
        <span class="text-[10px] text-slate-500">宽</span>
        <EditorNumberInput
          :min="30"
          :step="1"
          :class="PROP_NUMBER_WRAP"
          :input-class="PROP_NUMBER_INNER"
          :model-value="displayW"
          :placeholder="widthMixed ? '多种' : undefined"
          :disabled="disabled"
          @update:model-value="applyW"
        />
      </label>
      <label class="block min-w-0">
        <span class="text-[10px] text-slate-500">高</span>
        <EditorNumberInput
          :min="20"
          :step="1"
          :class="PROP_NUMBER_WRAP"
          :input-class="PROP_NUMBER_INNER"
          :model-value="displayH"
          :placeholder="heightMixed ? '多种' : undefined"
          :disabled="disabled"
          @update:model-value="applyH"
        />
      </label>
    </div>
    <p v-if="widthMixed || heightMixed" :class="PROP_HINT">选中项尺寸不一致时，输入新值将统一应用到未锁定组件。</p>
  </div>
  <p v-else :class="PROP_HINT">选中的组件均已锁定，无法修改尺寸。</p>
</template>
