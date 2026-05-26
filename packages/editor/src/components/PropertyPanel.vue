<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../stores/editorStore'
import { storeToRefs } from 'pinia'
import { PROP_SECTION } from './propertyPanel/shared'
import PagePropertyPanel from './propertyPanel/PagePropertyPanel.vue'
import CompPropertyPanel from './propertyPanel/CompPropertyPanel.vue'

const store = useEditorStore()
const { selectedIds, components } = storeToRefs(store)

const selectedComp = computed(() =>
  selectedIds.value.length === 1
    ? components.value.find((c) => c.id === selectedIds.value[0])
    : undefined
)
</script>

<template>
  <!-- Multi-select info -->
  <aside v-if="selectedIds.length > 1" class="w-[320px] border-l border-white/10 p-3 bg-[#0f1824]">
    <h2 :class="[PROP_SECTION, 'mb-3 flex items-center gap-1.5']">
      <span class="text-indigo-400 text-[8px]">◆</span>
      属性
    </h2>
    <div class="bg-indigo-500/10 border border-indigo-500/20 rounded-md px-3 py-2 text-xs text-indigo-300">
      已选中 {{ selectedIds.length }} 个组件
    </div>
  </aside>

  <!-- No selection → page properties -->
  <PagePropertyPanel v-else-if="!selectedComp" />

  <!-- Single selection → component properties -->
  <CompPropertyPanel v-else :comp="selectedComp" />
</template>
