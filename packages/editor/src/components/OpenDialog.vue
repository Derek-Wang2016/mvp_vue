<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '../stores/editorStore'
import { listPages, getPage, deletePage, copyPage, renamePage } from '../api'
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

const editingId = ref<number | null>(null)
const editingName = ref('')
const busyId = ref<number | null>(null)

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
  if (editingId.value !== null) return
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
  editingId.value = null
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

function startEdit(p: PageListItem, e: Event) {
  e.stopPropagation()
  editingId.value = p.id
  editingName.value = p.name
}

function cancelEdit(e?: Event) {
  e?.stopPropagation()
  editingId.value = null
  editingName.value = ''
}

async function saveEdit(e: Event) {
  e.stopPropagation()
  const id = editingId.value
  if (id === null) return
  const name = editingName.value.trim()
  if (!name) {
    error.value = '名称不能为空'
    return
  }
  busyId.value = id
  error.value = ''
  try {
    await renamePage(id, name)
    const row = pages.value.find((p) => p.id === id)
    if (row) row.name = name
    if (pageId.value === id) store.setPageName(name)
    cancelEdit()
  } catch {
    error.value = '重命名失败'
  } finally {
    busyId.value = null
  }
}

async function handleCopy(id: number, e: Event) {
  e.stopPropagation()
  if (editingId.value !== null) return
  busyId.value = id
  error.value = ''
  try {
    await copyPage(id)
    await fetchPages()
  } catch {
    error.value = '复制失败'
  } finally {
    busyId.value = null
  }
}

onMounted(fetchPages)
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="emit('close')">
    <div class="bg-[#111d2e] border border-white/10 rounded-xl shadow-2xl shadow-black/50 w-[560px] max-h-[70vh] flex flex-col">
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
        <div v-if="error" class="mb-2 px-2 py-1.5 text-xs text-red-400 text-center bg-red-500/10 border border-red-400/20 rounded-md">{{ error }}</div>
        <div v-if="loading" class="p-4 text-xs text-slate-500 text-center">加载中...</div>
        <div v-else-if="pages.length === 0" class="p-4 text-xs text-slate-600 text-center">暂无页面</div>
        <div
          v-for="p in pages"
          :key="p.id"
          class="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-white/5 cursor-pointer group transition-colors"
          :class="p.id === pageId ? 'bg-indigo-500/10 border border-indigo-400/20' : ''"
          @click="openPage(p.id)"
        >
          <span class="text-[10px] text-slate-600 font-mono w-10 shrink-0">{{ p.id }}</span>
          <span v-if="p.id === pageId" class="w-2 h-2 rounded-full bg-indigo-400 shrink-0" title="当前打开" />

          <div class="flex-1 min-w-0">
            <template v-if="editingId === p.id">
              <input
                v-model="editingName"
                class="w-full bg-white/10 border border-indigo-400/40 rounded px-2 py-1 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-indigo-400/40"
                :disabled="busyId === p.id"
                @click.stop
                @keyup.enter="saveEdit"
                @keyup.escape="cancelEdit"
              />
            </template>
            <template v-else>
              <div class="text-sm truncate" :class="p.id === pageId ? 'text-indigo-300 font-semibold' : 'text-slate-200'">{{ p.name }}</div>
              <div class="text-[10px] text-slate-600">{{ p.createdAt }}</div>
            </template>
          </div>

          <div class="flex items-center gap-1 shrink-0" @click.stop>
            <template v-if="editingId === p.id">
              <button
                class="text-[11px] text-indigo-300 hover:text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/30 disabled:opacity-50"
                :disabled="busyId === p.id"
                @click="saveEdit"
              >
                保存
              </button>
              <button
                class="text-[11px] text-slate-500 hover:text-slate-300 px-2 py-0.5"
                :disabled="busyId === p.id"
                @click="cancelEdit"
              >
                取消
              </button>
            </template>
            <template v-else>
              <button
                class="text-[11px] text-slate-500 hover:text-indigo-300 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
                :disabled="busyId === p.id"
                title="复制整页"
                @click="(e) => handleCopy(p.id, e)"
              >
                {{ busyId === p.id ? '…' : '复制' }}
              </button>
              <button
                class="text-[11px] text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                title="编辑名称"
                @click="(e) => startEdit(p, e)"
              >
                编辑
              </button>
              <button
                class="text-[11px] text-slate-600 hover:text-red-400 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                @click="(e) => requestDelete(p.id, e)"
              >
                删除
              </button>
            </template>
          </div>
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
