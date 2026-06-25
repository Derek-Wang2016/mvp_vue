<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PageComponent } from '@mvp-vue/schema'
import { isEditorLocked } from '@mvp-vue/schema'
import { useEditorStore } from '../../stores/editorStore'
import { getEditorDef } from '../registry/registry'
import { PROP_LABEL, PROP_HINT, PROP_SECTION } from './shared'
import ComponentLayoutFields from './ComponentLayoutFields.vue'
import { filterBatchPropsPatch } from '../../utils/batchEditPolicy'

const props = withDefaults(defineProps<{
  comp: PageComponent
  readOnly?: boolean
  /** 批量模式：将属性变更应用到这些组件 id */
  targetIds?: string[]
  batch?: boolean
}>(), {
  readOnly: false,
  batch: false,
})

const store = useEditorStore()
const tab = ref<'props' | 'data'>('props')

const def = computed(() => getEditorDef(props.comp.type))
const effectiveTargetIds = computed(() => props.targetIds ?? [props.comp.id])

const editableTargetIds = computed(() =>
  effectiveTargetIds.value.filter((id) => {
    const c = store.components.find((x) => x.id === id)
    return c != null && !isEditorLocked(c) && !c.groupId
  }),
)

const isLocked = computed(() => !props.batch && !!props.comp.locked)
const batchReadOnly = computed(() => props.batch && editableTargetIds.value.length === 0)
const fieldsDisabled = computed(() => !!props.readOnly || isLocked.value || batchReadOnly.value)

function updateProps(patch: Record<string, unknown>) {
  if (fieldsDisabled.value) return
  const finalPatch = props.batch ? filterBatchPropsPatch(props.comp.type, patch) : patch
  if (Object.keys(finalPatch).length === 0) return
  store.updateComponentsProps(
    props.batch ? effectiveTargetIds.value : [props.comp.id],
    finalPatch,
  )
}

function onDataSourceChange(e: Event) {
  if (fieldsDisabled.value) return
  const val = (e.target as HTMLSelectElement).value
  store.setComponentsDataSource(
    props.batch ? effectiveTargetIds.value : [props.comp.id],
    val || undefined,
  )
}

function toggleLock() {
  if (props.readOnly || props.batch) return
  store.setComponentLocked(props.comp.id, !isLocked.value)
}
</script>

<template>
  <aside
    class="editor-scrollbar relative z-30 shrink-0 w-[320px] border-l border-white/10 p-3 bg-[#0f1824] overflow-y-auto overflow-x-hidden min-h-0"
    :class="readOnly ? 'pointer-events-none opacity-60' : ''"
  >
    <h2 :class="[PROP_SECTION, 'mb-3 flex items-center justify-between gap-1.5']">
      <span class="flex items-center gap-1.5">
        <span class="text-indigo-400 text-[8px]">◆</span>
        属性
      </span>
      <button
        v-if="!batch"
        type="button"
        class="p-1 rounded border transition-colors"
        :class="isLocked
          ? 'border-amber-400/50 bg-amber-500/15 text-amber-300 hover:bg-amber-500/25'
          : 'border-white/10 bg-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10'"
        :title="isLocked ? '解锁组件' : '锁定组件'"
        @click="toggleLock"
      >
        <svg v-if="isLocked" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
        <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </svg>
      </button>
    </h2>

    <div v-if="isLocked" class="mb-3 bg-amber-500/10 border border-amber-500/25 rounded-md px-3 py-2 text-xs text-amber-300">
      组件已锁定，不可编辑。点击右上角锁图标或画布角标解锁。
    </div>
    <div v-else-if="batchReadOnly" class="mb-3 bg-amber-500/10 border border-amber-500/25 rounded-md px-3 py-2 text-xs text-amber-300">
      选中的组件均已锁定或属于组合，无法批量编辑属性。
    </div>

    <slot name="prepend" />

    <div class="flex gap-1 mb-3">
      <button
        :class="tab === 'props' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/[0.08] text-slate-400'"
        class="flex-1 text-[11px] py-1 rounded"
        @click="tab = 'props'"
      >属性</button>
      <button
        v-if="!batch"
        :class="tab === 'data' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/[0.08] text-slate-400'"
        class="flex-1 text-[11px] py-1 rounded"
        @click="tab = 'data'"
      >数据</button>
    </div>

    <!-- Props Tab -->
    <div v-if="tab === 'props'" class="space-y-3" :class="fieldsDisabled ? 'opacity-50 pointer-events-none' : ''">
      <div class="flex items-center gap-2 text-xs">
        <span class="text-slate-500 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">{{ comp.type }}</span>
        <span v-if="batch" class="text-indigo-400/90">批量编辑</span>
      </div>
      <ComponentLayoutFields v-if="!batch" :comp="comp" :disabled="fieldsDisabled" />
      <component
        v-if="def?.PropertyFields"
        :is="def.PropertyFields"
        :key="batch ? `batch-${comp.type}-${comp.id}` : comp.id"
        :comp="comp"
        :batch="batch"
        :update-props="updateProps"
      />
    </div>

    <!-- Data Tab（批量模式不显示） -->
    <div v-if="!batch && tab === 'data'" class="space-y-3" :class="fieldsDisabled ? 'opacity-50 pointer-events-none' : ''">
      <label class="block">
        <span :class="PROP_LABEL">绑定数据源</span>
        <select
          class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
          :value="comp.dataSourceId ?? ''"
          :disabled="fieldsDisabled"
          @change="onDataSourceChange"
        >
          <option value="">无</option>
          <option v-for="ds in store.dataSources" :key="ds.id" :value="ds.id">{{ ds.id }} ({{ ds.type }})</option>
        </select>
      </label>

      <component
        v-if="def?.DataFields"
        :is="def.DataFields"
        :key="batch ? `batch-data-${comp.type}-${comp.id}` : comp.id"
        :comp="comp"
        :update-props="updateProps"
        :data-source-id="comp.dataSourceId"
        :data-sources="store.dataSources"
      />

      <p v-if="store.dataSources.length === 0" :class="PROP_HINT">暂无数据源，在页面属性中添加</p>
    </div>
  </aside>
</template>
