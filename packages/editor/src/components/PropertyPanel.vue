<script setup lang="ts">
import { computed } from 'vue'
import type { PageComponent } from '@mvp-vue/schema'
import { useEditorStore } from '../stores/editorStore'
import { storeToRefs } from 'pinia'
import { PROP_SECTION } from './propertyPanel/shared'
import PagePropertyPanel from './propertyPanel/PagePropertyPanel.vue'
import CompPropertyPanel from './propertyPanel/CompPropertyPanel.vue'
import MultiSelectLayoutFields from './propertyPanel/MultiSelectLayoutFields.vue'
import GroupLayoutFields from './propertyPanel/GroupLayoutFields.vue'

const store = useEditorStore()
const { selectedIds, anchorComponentId, components, pageReadOnly, fullGroupSelection, activeGroupId, activeGroupLocked } = storeToRefs(store)

const selectedComps = computed(() =>
  selectedIds.value
    .map((id) => components.value.find((c) => c.id === id))
    .filter((c): c is PageComponent => c != null),
)

const selectedComp = computed(() =>
  selectedIds.value.length === 1 ? selectedComps.value[0] : undefined,
)

const isFullGroup = computed(() => fullGroupSelection.value.isFullGroup)

/** 多选且所有选中组件类型相同（非完整组合选中） */
const isHomogeneousMultiSelect = computed(() => {
  if (selectedIds.value.length < 2 || isFullGroup.value) return false
  const types = new Set(selectedComps.value.map((c) => c.type))
  return types.size === 1 && selectedComps.value.length === selectedIds.value.length
})

const homogeneousMultiComp = computed(() => {
  if (!isHomogeneousMultiSelect.value) return undefined
  const anchorId = anchorComponentId.value
  if (anchorId) {
    const anchor = selectedComps.value.find((c) => c.id === anchorId)
    if (anchor) return anchor
  }
  return selectedComps.value[0]
})

function lockSelected() {
  store.setComponentsLocked([...selectedIds.value], true)
}

function unlockSelected() {
  store.setComponentsLocked([...selectedIds.value], false)
}

function lockGroup() {
  if (activeGroupId.value) store.setGroupLocked(activeGroupId.value, true)
}

function unlockGroup() {
  if (activeGroupId.value) store.setGroupLocked(activeGroupId.value, false)
}
</script>

<template>
  <!-- Full group selection -->
  <aside
    v-if="isFullGroup"
    class="editor-scrollbar w-[320px] border-l border-white/10 p-3 bg-[#0f1824] overflow-y-auto min-h-0"
    :class="pageReadOnly ? 'pointer-events-none opacity-60' : ''"
  >
    <h2 :class="[PROP_SECTION, 'mb-3 flex items-center gap-1.5']">
      <span class="text-violet-400 text-[8px]">◆</span>
      属性
    </h2>
    <div class="bg-violet-500/10 border border-violet-500/20 rounded-md px-3 py-2 text-xs text-violet-300 mb-3">
      组合（{{ fullGroupSelection.memberIds.length }} 个组件）
      <div v-if="activeGroupLocked" class="mt-1 text-[10px] text-amber-300/90">已锁定组合</div>
    </div>
    <GroupLayoutFields :disabled="pageReadOnly || activeGroupLocked" class="mb-3" />

    <div class="flex gap-2">
      <button
        v-if="!activeGroupLocked"
        type="button"
        class="flex-1 text-[11px] py-1.5 rounded border border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition-colors"
        @click="lockGroup"
      >
        锁定组合
      </button>
      <button
        v-else
        type="button"
        class="flex-1 text-[11px] py-1.5 rounded border border-white/15 bg-white/5 text-slate-300 hover:bg-white/10 transition-colors"
        @click="unlockGroup"
      >
        解锁组合
      </button>
    </div>
  </aside>

  <!-- Homogeneous multi-select → batch component properties -->
  <CompPropertyPanel
    v-else-if="isHomogeneousMultiSelect && homogeneousMultiComp"
    :comp="homogeneousMultiComp"
    :target-ids="[...selectedIds]"
    batch
    :read-only="pageReadOnly"
  >
    <template #prepend>
      <div class="bg-indigo-500/10 border border-indigo-500/20 rounded-md px-3 py-2 text-xs text-indigo-300 mb-3">
        已选中 {{ selectedIds.length }} 个同类型组件
        <div class="mt-1 text-[10px] text-indigo-400/90 font-mono">{{ homogeneousMultiComp.type }}</div>
        <div v-if="anchorComponentId" class="mt-1 text-[10px] text-indigo-400/90">
          属性预览基准：{{ anchorComponentId }}
        </div>
        <p class="mt-1 text-[10px] text-indigo-400/70">仅批量修改显示样式；内容、数据源、图片/图标地址等需单独编辑</p>
      </div>
      <MultiSelectLayoutFields :disabled="pageReadOnly" class="mb-3" />

      <div class="flex gap-2 mb-3">
        <button
          type="button"
          class="flex-1 text-[11px] py-1.5 rounded border border-violet-400/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-colors disabled:opacity-40"
          :disabled="pageReadOnly || !store.canGroup"
          @click="store.groupSelectedComponents()"
        >
          组合
        </button>
      </div>

      <div class="flex gap-2 mb-3">
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
    </template>
  </CompPropertyPanel>

  <!-- Heterogeneous multi-select -->
  <aside
    v-else-if="selectedIds.length > 1"
    class="editor-scrollbar w-[320px] border-l border-white/10 p-3 bg-[#0f1824] overflow-y-auto min-h-0"
    :class="pageReadOnly ? 'pointer-events-none opacity-60' : ''"
  >
    <h2 :class="[PROP_SECTION, 'mb-3 flex items-center gap-1.5']">
      <span class="text-indigo-400 text-[8px]">◆</span>
      属性
    </h2>
    <div class="bg-indigo-500/10 border border-indigo-500/20 rounded-md px-3 py-2 text-xs text-indigo-300 mb-3">
      已选中 {{ selectedIds.length }} 个组件
      <div v-if="anchorComponentId" class="mt-1 text-[10px] text-indigo-400/90">
        对齐基准：{{ anchorComponentId }}
      </div>
    </div>
    <MultiSelectLayoutFields :disabled="pageReadOnly" />

    <div class="flex gap-2 mt-3">
      <button
        type="button"
        class="flex-1 text-[11px] py-1.5 rounded border border-violet-400/40 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20 transition-colors disabled:opacity-40"
        :disabled="pageReadOnly || !store.canGroup"
        @click="store.groupSelectedComponents()"
      >
        组合
      </button>
    </div>

    <div class="flex gap-2 mt-2">
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
