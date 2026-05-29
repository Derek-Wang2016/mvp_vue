<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  open: boolean
  mode: 'export' | 'import'
  title: string
  props: Record<string, unknown>
}>()

const emit = defineEmits<{
  close: []
  import: [props: Record<string, unknown>]
}>()

const importText = ref('')
const importErr = ref('')

function handleImport() {
  importErr.value = ''
  try {
    const parsed = JSON.parse(importText.value)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      importErr.value = '请输入有效的 JSON 对象'
      return
    }
    emit('import', parsed as Record<string, unknown>)
    importText.value = ''
  } catch {
    importErr.value = 'JSON 格式错误'
  }
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click="emit('close')">
    <div class="bg-[#1a2332] border border-white/20 rounded-lg shadow-2xl p-5 w-[500px]" @click.stop>
      <h3 class="text-sm font-medium text-slate-200 mb-3">{{ title }}</h3>

      <template v-if="mode === 'export'">
        <pre class="editor-scrollbar text-[11px] text-slate-300 bg-white/5 p-3 rounded max-h-80 overflow-y-auto overflow-x-hidden font-mono">{{ JSON.stringify(props, null, 2) }}</pre>
        <div class="flex justify-end mt-3">
          <button class="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors" @click="emit('close')">关闭</button>
        </div>
      </template>

      <template v-else>
        <textarea
          v-model="importText"
          class="editor-scrollbar w-full h-60 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-xs text-slate-200 font-mono resize-none outline-none focus:border-indigo-400/50 overflow-y-auto"
          placeholder="粘贴 JSON..."
        />
        <p v-if="importErr" class="text-[10px] text-red-400 mt-1">{{ importErr }}</p>
        <div class="flex justify-end gap-2 mt-3">
          <button class="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors" @click="emit('close')">取消</button>
          <button class="px-4 py-1.5 text-xs bg-indigo-500/30 text-indigo-300 rounded hover:bg-indigo-500/40" @click="handleImport">导入</button>
        </div>
      </template>
    </div>
  </div>
</template>
