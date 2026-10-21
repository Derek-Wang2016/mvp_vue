<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import type { PageComponent } from '@mvp-vue/schema'
import { buildEditableTextBoxStyle } from '@mvp-vue/schema'
import { fetchEditableText, saveEditableText } from '../editableTextApi'

const props = defineProps<{ comp: PageComponent }>()

const content = ref('')
const draft = ref('')
const open = ref(false)
const saving = ref(false)
const message = ref('')

const textStyle = computed(() => ({
  ...buildEditableTextBoxStyle(props.comp.props),
  cursor: 'text',
}))

const rowKey = computed(() => String(props.comp.props.rowKey ?? '').trim())

async function load() {
  if (!rowKey.value) {
    content.value = ''
    message.value = ''
    return
  }
  try {
    const row = await fetchEditableText(rowKey.value)
    content.value = row?.content ?? ''
    message.value = row ? '' : '数据行不存在'
  } catch (e) {
    message.value = e instanceof Error ? e.message : '读取失败'
  }
}

function beginEdit() {
  if (!rowKey.value) return
  draft.value = content.value
  message.value = ''
  open.value = true
}

async function commit() {
  if (!rowKey.value || saving.value) return
  saving.value = true
  try {
    const row = await saveEditableText(rowKey.value, draft.value)
    content.value = row.content
    open.value = false
    message.value = ''
  } catch (e) {
    message.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

onMounted(() => { void load() })
watch(rowKey, () => { void load() })
</script>

<template>
  <div class="w-full h-full px-1" :style="textStyle" title="双击编辑" @dblclick.stop="beginEdit">
    <span v-if="content" class="w-full">{{ content }}</span>
    <span v-else class="w-full opacity-50">{{ rowKey ? (message || '双击输入') : '未配置 KEY' }}</span>
  </div>
  <Teleport to="body">
    <div
      v-if="open"
      class="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center"
      @mousedown.self="open = false"
    >
      <div class="w-[420px] max-w-[92vw] rounded-lg bg-[#121a26] border border-white/10 p-4 shadow-xl">
        <p class="text-xs text-slate-400 mb-2">编辑数据行 · {{ rowKey }}</p>
        <textarea
          v-model="draft"
          rows="5"
          class="w-full bg-white/[0.06] border border-white/15 rounded-md px-2.5 py-2 text-sm text-slate-100 outline-none focus:border-indigo-400/50"
        />
        <p v-if="message" class="text-[11px] text-rose-300 mt-1">{{ message }}</p>
        <div class="flex justify-end gap-2 mt-3">
          <button type="button" class="px-3 py-1 text-xs text-slate-300" @click="open = false">取消</button>
          <button
            type="button"
            class="px-3 py-1 text-xs rounded bg-indigo-500 text-white disabled:opacity-40"
            :disabled="saving"
            @click="commit"
          >保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
