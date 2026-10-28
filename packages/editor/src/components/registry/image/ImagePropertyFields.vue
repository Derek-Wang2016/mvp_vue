<script setup lang="ts">
import { ref } from 'vue'
import { PROP_LABEL } from '../../propertyPanel/shared'
import ImageLibraryDialog from '../../ImageLibraryDialog.vue'
import type { ComponentPropertyFieldsProps } from '../types'

const props = defineProps<ComponentPropertyFieldsProps>()
const libraryOpen = ref(false)
</script>

<template>
  <p v-if="batch" class="text-[11px] text-slate-400 mb-2">批量模式下不可修改图片地址</p>
  <label v-if="!batch" class="block">
    <span :class="PROP_LABEL">图片 URL</span>
    <input
      class="w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
      placeholder="https://..."
      :value="(comp.props.src as string) ?? ''"
      @change="props.updateProps({ src: ($event.target as HTMLInputElement).value })"
    />
    <button
      type="button"
      class="mt-1.5 px-2 py-1 text-[11px] rounded border border-white/15 text-slate-200 hover:bg-white/10"
      @click="libraryOpen = true"
    >从图库选择</button>
  </label>
  <ImageLibraryDialog
    v-if="libraryOpen"
    @close="libraryOpen = false"
    @select="(url: string) => { props.updateProps({ src: url }); libraryOpen = false }"
  />
</template>
