<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../stores/editorStore'
import { storeToRefs } from 'pinia'
import { PROP_SECTION } from './propertyPanel/shared'
import PagePropertyPanel from './propertyPanel/PagePropertyPanel.vue'
import CompPropertyPanel from './propertyPanel/CompPropertyPanel.vue'

const store = useEditorStore()
const { selectedIds, components, pageReadOnly } = storeToRefs(store)

const selectedComp = computed(() =>
  selectedIds.value.length === 1
    ? components.value.find((c) => c.id === selectedIds.value[0])
    : undefined
)

function lockSelected() {
  store.setComponentsLocked([...selectedIds.value], true)
}

function unlockSelected() {
  store.setComponentsLocked([...selectedIds.value], false)
}
</script>

<template>
  <!-- Multi-select info -->
  <aside
    v-if="selectedIds.length > 1"
    class="editor-scrollbar w-[320px] border-l border-white/10 p-3 bg-[#0f1824] overflow-y-auto min-h-0"
    :class="pageReadOnly ? 'pointer-events-none opacity-60' : ''"
  >
    <h2 :class="[PROP_SECTION, 'mb-3 flex items-center gap-1.5']">
      <span class="text-indigo-400 text-[8px]">◆</span>
      属性
    </h2>
    <div class="bg-indigo-500/10 border border-indigo-500/20 rounded-md px-3 py-2 text-xs text-indigo-300 mb-3">
      已选中 {{ selectedIds.length }} 个组件
    </div>
    <div class="flex gap-2">
      <button
        type="button"
        class="flex-1 text-[11px] py-1.5 rounded border border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors"
        @click="lockSelected"
      >
        锁定选中
      </button>
      <button
        type="button"
        class="flex-1 text-[11px] py-1.5 rounded border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 transition-colors"
        @click="unlockSelected"
      >
        解锁选中
      </button>
    </div>
  </aside>

  <!-- No selection → page properties -->
  <PagePropertyPanel v-else-if="!selectedComp" :read-only="pageReadOnly" />

  <!-- Single selection → component properties -->
  <CompPropertyPanel v-else :comp="selectedComp" :read-only="pageReadOnly" />
</template>
