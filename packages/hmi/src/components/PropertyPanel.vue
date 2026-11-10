<script setup lang="ts">
import { computed } from 'vue'
import type { HmiNode } from '../types'

const props = defineProps<{ node: HmiNode | undefined }>()
const emit = defineEmits<{ patch: [patch: Partial<HmiNode>] }>()

const layout = computed(() => props.node?.layout ?? {})

function num(value: string, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function patchSize(key: 'w' | 'h', value: string) {
  emit('patch', { size: { ...(props.node?.size ?? {}), [key]: num(value) } })
}

function patchLayout(key: string, value: string | number) {
  emit('patch', { layout: { ...layout.value, [key]: value } })
}
</script>

<template>
  <div v-if="!node" class="p-3 text-sm text-slate-500">选中画布上的节点后编辑属性。</div>
  <div v-else class="space-y-3 p-3 text-sm">
    <div class="text-slate-400">{{ node.type }}</div>
    <label class="block">标识
      <input class="field" :value="node.id ?? ''" @change="emit('patch', { id: ($event.target as HTMLInputElement).value })" />
    </label>
    <div class="grid grid-cols-2 gap-2">
      <label>宽<input class="field" type="number" :value="node.size?.w ?? ''" @change="patchSize('w', ($event.target as HTMLInputElement).value)" /></label>
      <label>高<input class="field" type="number" :value="node.size?.h ?? ''" @change="patchSize('h', ($event.target as HTMLInputElement).value)" /></label>
    </div>
    <label class="block">底色
      <input class="field" :value="node.bg_color ?? ''" @change="emit('patch', { bg_color: ($event.target as HTMLInputElement).value })" />
    </label>
    <label class="block">圆角
      <input class="field" type="number" :value="node.radius ?? 0" @change="emit('patch', { radius: num(($event.target as HTMLInputElement).value) })" />
    </label>

    <template v-if="node.type === 'container' || node.type === 'value'">
      <label class="block">方向
        <select class="field" :value="layout.flow ?? 'column'" @change="patchLayout('flow', ($event.target as HTMLSelectElement).value)">
          <option value="column">纵向</option>
          <option value="row">横向</option>
        </select>
      </label>
      <div class="grid grid-cols-2 gap-2">
        <label>行距<input class="field" type="number" :value="layout.gap_row ?? 0" @change="patchLayout('gap_row', num(($event.target as HTMLInputElement).value))" /></label>
        <label>列距<input class="field" type="number" :value="layout.gap_col ?? 0" @change="patchLayout('gap_col', num(($event.target as HTMLInputElement).value))" /></label>
      </div>
    </template>

    <template v-if="node.type === 'label' || node.type === 'value'">
      <label class="block">标题
        <input class="field" :value="node.title ?? ''" @change="emit('patch', { title: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="block">标题字体
        <input class="field" :value="node.title_font ?? ''" @change="emit('patch', { title_font: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="block">标题颜色
        <input class="field" :value="node.title_color ?? ''" @change="emit('patch', { title_color: ($event.target as HTMLInputElement).value })" />
      </label>
    </template>

    <template v-if="node.type === 'value' || node.type === 'qrcode' || node.type === 'split'">
      <label class="block">数据字段
        <input class="field" :value="node.prop ?? ''" @change="emit('patch', { prop: ($event.target as HTMLInputElement).value })" />
      </label>
    </template>

    <template v-if="node.type === 'value' || node.type === 'split'">
      <label class="block">值字体
        <input class="field" :value="node.value_font ?? ''" @change="emit('patch', { value_font: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="block">值颜色
        <input class="field" :value="node.value_color ?? ''" @change="emit('patch', { value_color: ($event.target as HTMLInputElement).value })" />
      </label>
    </template>

    <template v-if="node.type === 'split'">
      <label class="block">分隔符
        <input class="field" :value="node.split ?? ','" @change="emit('patch', { split: ($event.target as HTMLInputElement).value })" />
      </label>
      <label class="block">默认色
        <input class="field" :value="node.default_color ?? ''" @change="emit('patch', { default_color: ($event.target as HTMLInputElement).value })" />
      </label>
    </template>

    <template v-if="node.type === 'image'">
      <label class="block">地址（本地路径或 http）
        <input class="field" :value="node.src ?? ''" @change="emit('patch', { src: ($event.target as HTMLInputElement).value })" />
      </label>
    </template>
  </div>
</template>

<style scoped>
.field {
  margin-top: 4px;
  width: 100%;
  border-radius: 4px;
  border: 1px solid rgb(51 65 85);
  background: rgb(15 23 42);
  padding: 4px 8px;
}
</style>
