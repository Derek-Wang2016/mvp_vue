<script setup lang="ts">
import { computed } from 'vue'
function readEditableImportFieldWhitelist(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.map((k) => String(k))
}
import type { ComponentDataFieldsProps } from '../types'
import { PROP_HINT } from '../../propertyPanel/shared'
import ImportFieldWhitelistSection from '../shared/ImportFieldWhitelistSection.vue'

const props = defineProps<ComponentDataFieldsProps>()

const boundDs = computed(() =>
  props.dataSourceId ? props.dataSources.find((d) => d.id === props.dataSourceId) : undefined,
)

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
      已绑定数据源 <span class="text-slate-300 font-mono">{{ boundDs.id }}</span>（{{ boundDs.type }}），组件内
      API URL 不生效。
    </p>
    <p v-else :class="PROP_HINT">未绑定数据源时，请在「属性」Tab 配置 API URL。</p>

    <p :class="PROP_HINT">列表路径、总数路径仍在「属性」Tab 配置。</p>

    <ImportFieldWhitelistSection
      :model-value="importWhitelist"
      @update:model-value="setImportWhitelist"
    />
  </div>
</template>
