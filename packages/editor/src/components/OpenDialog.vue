<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '../stores/editorStore'
import { listPages, getPage, deletePage } from '../api'
import type { PageListItem } from '../api'
import ConfirmDialog from './ConfirmDialog.vue'

const emit = defineEmits<{ close: [] }>()
const store = useEditorStore()
const { pageId } = storeToRefs(store)

const pages = ref<PageListItem[]>([])
const loading = ref(false)
const error = ref('')
const newName = ref('')
const confirmOpen = ref(false)
const confirmTargetId = ref<number | null>(null)

async function fetchPages() {
  loading.value = true
  error.value = ''
  try {
    pages.value = await listPages()
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

async function openPage(id: number) {
  try {
    const data = await getPage(id)
    store.loadPage(data.id, data.name, data.schemaJson)
    emit('close')
  } catch {
    error.value = '打开失败'
  }
}

function requestDelete(id: number, e: Event) {
  e.stopPropagation()
  confirmTargetId.value = id
  confirmOpen.value = true
}

async function handleDelete() {
  if (confirmTargetId.value === null) return
  try {
    await deletePage(confirmTargetId.value)
    pages.value = pages.value.filter((p) => p.id !== confirmTargetId.value)
  } catch {
    error.value = '删除失败'
  } finally {
    confirmOpen.value = false
    confirmTargetId.value = null
  }
}

function newPage() {
  store.loadPage(0, newName.value || '未命名大屏', {
    width: 1920,
    height: 1080,
    components: [],
  })
  emit('close')
}

onMounted(fetchPages)
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="emit('close')">
    <div class="bg-[#111d2e] border border-white/10 rounded-xl shadow-2xl shadow-black/50 w-[480px] max-h-[70vh] flex flex-col">
      <div class="p-4 border-b border-white/10 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-200">打开页面</h3>
        <button class="text-slate-500 hover:text-slate-300 text-lg leading-none" @click="emit('close')">&times;</button>
      </div>

      <!-- new page -->
      <div class="p-3 border-b border-white/10 flex gap-2">
        <input
          v-model="newName"
          class="flex-1 bg-white/5 border border-white/10 rounded-md px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-indigo-400/50"
          placeholder="新页面名称"
          @keyup.enter="newPage"
        />
        <button
          class="bg-indigo-500 hover:bg-indigo-400 text-white text-xs px-4 py-1 rounded-md transition-colors"
          @click="newPage"
        >
          新建
        </button>
      </div>

      <!-- list -->
      <div class="editor-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-2">
        <div v-if="loading" class="p-4 text-xs text-slate-500 text-center">加载中...</div>
        <div v-else-if="error" class="p-4 text-xs text-red-400 text-center">{{ error }}</div>
        <div v-else-if="pages.length === 0" class="p-4 text-xs text-slate-600 text-center">暂无页面</div>
        <div
          v-for="p in pages"
          :key="p.id"
          class="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-white/5 cursor-pointer group transition-colors"
          :class="p.id === pageId ? 'bg-indigo-500/10 border border-indigo-400/20' : ''"
          @click="openPage(p.id)"
        >
          <span class="text-[10px] text-slate-600 font-mono w-10 shrink-0">{{ p.id }}</span>
          <span v-if="p.id === pageId" class="w-2 h-2 rounded-full bg-indigo-400 shrink-0" title="当前打开" />
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate" :class="p.id === pageId ? 'text-indigo-300 font-semibold' : 'text-slate-200'">{{ p.name }}</div>
            <div class="text-[10px] text-slate-600">{{ p.createdAt }}</div>
          </div>
          <button
            class="text-slate-600 hover:text-red-400 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            @click="(e) => requestDelete(p.id, e)"
          >
            删除
          </button>
        </div>
      </div>
    </div>
  </div>

  <ConfirmDialog
    v-if="confirmOpen"
    title="删除页面"
    message="确定删除此页面？删除后不可恢复。"
    confirm-label="删除"
    danger
    @confirm="handleDelete"
    @cancel="confirmOpen = false; confirmTargetId = null"
  />
</template>
