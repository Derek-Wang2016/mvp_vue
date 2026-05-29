<script setup lang="ts">
import { computed } from 'vue'
import { useEditorStore } from '../stores/editorStore'

defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const store = useEditorStore()
const json = computed(() => JSON.stringify(store.toSchema(), null, 2))
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="emit('close')">
    <div class="bg-[#111d2e] border border-white/10 rounded-xl shadow-2xl shadow-black/50 w-[640px] max-h-[80vh] flex flex-col">
      <div class="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-200">页面 JSON</h3>
        <button class="text-slate-500 hover:text-slate-300 text-lg leading-none" @click="emit('close')">&times;</button>
      </div>
      <div class="editor-scrollbar flex-1 overflow-y-auto overflow-x-hidden p-4 min-h-0">
        <pre class="text-xs text-slate-300 font-mono whitespace-pre-wrap break-all">{{ json }}</pre>
      </div>
    </div>
  </div>
</template>
