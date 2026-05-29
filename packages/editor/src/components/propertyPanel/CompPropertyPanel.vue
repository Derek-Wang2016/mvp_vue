<script setup lang="ts">
import { ref, computed } from 'vue'
import type { PageComponent } from '@mvp-vue/schema'
import { useEditorStore } from '../../stores/editorStore'
import { getEditorDef } from '../registry/registry'
import { PROP_LABEL, PROP_HINT, PROP_SECTION } from './shared'

const props = defineProps<{
  comp: PageComponent
}>()

const store = useEditorStore()
const tab = ref<'props' | 'data'>('props')

const def = computed(() => getEditorDef(props.comp.type))

function updateProps(patch: Record<string, unknown>) {
  store.updateComponentProps(props.comp.id, patch)
}

function onDataSourceChange(e: Event) {
  const val = (e.target as HTMLSelectElement).value
  store.setComponentDataSource(props.comp.id, val || undefined)
}
</script>

<template>
  <aside class="editor-scrollbar relative z-30 shrink-0 w-[320px] border-l border-white/10 p-3 bg-[#0f1824] overflow-y-auto overflow-x-hidden min-h-0">
    <h2 :class="[PROP_SECTION, 'mb-3 flex items-center gap-1.5']">
      <span class="text-indigo-400 text-[8px]">◆</span>
      属性
    </h2>

    <div class="flex gap-1 mb-3">
      <button
        :class="tab === 'props' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/[0.08] text-slate-400'"
        class="flex-1 text-[11px] py-1 rounded"
        @click="tab = 'props'"
      >属性</button>
      <button
        :class="tab === 'data' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/[0.08] text-slate-400'"
        class="flex-1 text-[11px] py-1 rounded"
        @click="tab = 'data'"
      >数据</button>
    </div>

    <!-- Props Tab -->
    <div v-if="tab === 'props'" class="space-y-3">
      <div class="flex items-center gap-2 text-xs">
        <span class="text-slate-500 bg-white/5 border border-white/10 rounded px-1.5 py-0.5">{{ comp.type }}</span>
        <span class="text-[11px] text-slate-400">x={{ comp.x }}, y={{ comp.y }} | {{ comp.w }}×{{ comp.h }}</span>
      </div>
      <component
        v-if="def?.PropertyFields"
        :is="def.PropertyFields"
        :key="comp.id"
        :comp="comp"
        :update-props="updateProps"
      />
    </div>

    <!-- Data Tab -->
    <div v-if="tab === 'data'" class="space-y-3">
      <label class="block">
        <span :class="PROP_LABEL">绑定数据源</span>
        <select
          class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
          :value="comp.dataSourceId ?? ''"
          @change="onDataSourceChange"
        >
          <option value="">无</option>
          <option v-for="ds in store.dataSources" :key="ds.id" :value="ds.id">{{ ds.id }} ({{ ds.type }})</option>
        </select>
      </label>

      <component
        v-if="def?.DataFields"
        :is="def.DataFields"
        :key="comp.id"
        :comp="comp"
        :update-props="updateProps"
        :data-source-id="comp.dataSourceId"
        :data-sources="store.dataSources"
      />

      <p v-if="store.dataSources.length === 0" :class="PROP_HINT">暂无数据源，在页面属性中添加</p>
    </div>
  </aside>
</template>
