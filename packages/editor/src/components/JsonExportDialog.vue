<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  open: boolean
  title?: string
  data: unknown
  hint?: string
}>()

const emit = defineEmits<{
  close: []
}>()

const copied = ref(false)

async function copyJson() {
  try {
    await navigator.clipboard.writeText(JSON.stringify(props.data, null, 2))
    copied.value = true
    setTimeout(() => copied.value = false, 2000)
  } catch {
    // fallback
  }
}
</script>

<template>
  <Teleport to="body">
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click="emit('close')">
    <div class="bg-[#1a2332] border border-white/20 rounded-lg shadow-2xl p-5 w-[500px]" @click.stop>
      <h3 class="text-sm font-medium text-slate-200 mb-2">{{ title ?? '导出 JSON' }}</h3>
      <p v-if="hint" class="text-[11px] text-slate-500 mb-2">{{ hint }}</p>
      <pre class="editor-scrollbar text-[11px] text-slate-300 bg-white/5 p-3 rounded max-h-80 overflow-y-auto overflow-x-hidden font-mono">{{ JSON.stringify(data, null, 2) }}</pre>
      <div class="flex justify-end gap-2 mt-3">
        <button class="px-3 py-1.5 text-xs bg-indigo-500/30 text-indigo-300 rounded hover:bg-indigo-500/40 transition-colors" @click="copyJson">
          {{ copied ? '已复制' : '复制' }}
        </button>
        <button class="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors" @click="emit('close')">关闭</button>
      </div>
    </div>
  </div>
  </Teleport>
</template>
