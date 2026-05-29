<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  open: boolean
  title?: string
}>()

const emit = defineEmits<{
  close: []
  import: [config: Record<string, unknown>]
}>()

const text = ref('')
const error = ref('')

function handleImport() {
  error.value = ''
  try {
    const config = JSON.parse(text.value)
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      error.value = '请粘贴一个 JSON 对象'
      return
    }
    emit('import', config as Record<string, unknown>)
    text.value = ''
  } catch {
    error.value = 'JSON 格式错误'
  }
}

function onClose() {
  text.value = ''
  error.value = ''
  emit('close')
}
</script>

<template>
  <Teleport to="body">
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click="onClose">
    <div class="bg-[#1a2332] border border-white/20 rounded-lg shadow-2xl p-5 w-[500px]" @click.stop>
      <h3 class="text-sm font-medium text-slate-200 mb-3">{{ title ?? '导入 JSON' }}</h3>
      <textarea
        v-model="text"
        class="editor-scrollbar w-full h-60 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-xs text-slate-200 font-mono resize-none outline-none focus:border-indigo-400/50 transition-colors overflow-y-auto"
        placeholder="粘贴 JSON..."
      />
      <p v-if="error" class="text-[10px] text-red-400 mt-1">{{ error }}</p>
      <div class="flex justify-end gap-2 mt-3">
        <button class="px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors" @click="onClose">取消</button>
        <button class="px-4 py-1.5 text-xs bg-indigo-500/30 text-indigo-300 rounded hover:bg-indigo-500/40 transition-colors" @click="handleImport">导入</button>
      </div>
    </div>
  </div>
  </Teleport>
</template>
