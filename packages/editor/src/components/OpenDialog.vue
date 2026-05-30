<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { storeToRefs } from 'pinia'
import { useEditorStore } from '../stores/editorStore'
import {
  listPages, getPage, deletePage, copyPage, renamePage, promotePageFromDraft,
} from '../api'
import type { PageListItem, PageScope } from '../api'
import { isPageScopeReadOnly } from '../pagePolicy'
import ConfirmDialog from './ConfirmDialog.vue'

const emit = defineEmits<{ close: [] }>()
const store = useEditorStore()
const { pageId, pageScope } = storeToRefs(store)

const activeTab = ref<PageScope>('draft')
const draftPages = ref<PageListItem[]>([])
const publishPages = ref<PageListItem[]>([])
const loading = ref(false)
const error = ref('')
const newName = ref('')
const confirmOpen = ref(false)
const confirmTargetId = ref<number | null>(null)
const confirmTargetScope = ref<PageScope>('draft')

const editingId = ref<number | null>(null)
const editingScope = ref<PageScope>('draft')
const editingName = ref('')
const busyKey = ref('')

const PAGE_SIZE = 8
const draftPageIndex = ref(1)
const publishPageIndex = ref(1)

const pages = computed(() => (activeTab.value === 'draft' ? draftPages.value : publishPages.value))

const currentPageIndex = computed({
  get: () => (activeTab.value === 'draft' ? draftPageIndex.value : publishPageIndex.value),
  set: (v: number) => {
    const next = Math.max(1, v)
    if (activeTab.value === 'draft') draftPageIndex.value = next
    else publishPageIndex.value = next
  },
})

const totalPages = computed(() => Math.max(1, Math.ceil(pages.value.length / PAGE_SIZE)))

const pagedPages = computed(() => {
  if (pages.value.length === 0) return []
  const start = (currentPageIndex.value - 1) * PAGE_SIZE
  return pages.value.slice(start, start + PAGE_SIZE)
})

/** 末页不足 PAGE_SIZE 时用占位行撑满，避免切换分页时列表高度变化 */
const placeholderCount = computed(() => {
  if (loading.value || pages.value.length === 0) return 0
  return PAGE_SIZE - pagedPages.value.length
})

function clampPageIndex() {
  const max = totalPages.value
  if (currentPageIndex.value > max) currentPageIndex.value = max
}

function goPrevPage() {
  if (currentPageIndex.value > 1) currentPageIndex.value -= 1
}

function goNextPage() {
  if (currentPageIndex.value < totalPages.value) currentPageIndex.value += 1
}

function switchTab(tab: PageScope) {
  if (activeTab.value === tab) return
  cancelEdit()
  activeTab.value = tab
}

function pageKey(scope: PageScope, id: number) {
  return `${scope}:${id}`
}

function isCurrentOpen(scope: PageScope, id: number) {
  return pageId.value === id && pageScope.value === scope
}

function isListItemReadOnly(scope: PageScope) {
  return isPageScopeReadOnly(scope)
}

function canWriteTab(scope: PageScope) {
  return !isPageScopeReadOnly(scope)
}

async function fetchPages() {
  loading.value = true
  error.value = ''
  try {
    const [draft, publish] = await Promise.all([
      listPages('draft'),
      listPages('publish'),
    ])
    draftPages.value = draft
    publishPages.value = publish
    clampPageIndex()
  } catch {
    error.value = '加载失败'
  } finally {
    loading.value = false
  }
}

async function openPage(scope: PageScope, id: number) {
  if (editingId.value !== null) return
  try {
    const data = await getPage(scope, id)
    store.loadPage(data.id, data.name, data.schemaJson, scope)
    emit('close')
  } catch {
    error.value = '打开失败'
  }
}

function requestDelete(scope: PageScope, id: number, e: Event) {
  e.stopPropagation()
  if (isListItemReadOnly(scope)) return
  editingId.value = null
  confirmTargetScope.value = scope
  confirmTargetId.value = id
  confirmOpen.value = true
}

async function handleDelete() {
  if (confirmTargetId.value === null) return
  const scope = confirmTargetScope.value
  const id = confirmTargetId.value
  try {
    await deletePage(scope, id)
    if (scope === 'draft') {
      draftPages.value = draftPages.value.filter((p) => p.id !== id)
    } else {
      publishPages.value = publishPages.value.filter((p) => p.id !== id)
    }
    clampPageIndex()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '删除失败'
  } finally {
    confirmOpen.value = false
    confirmTargetId.value = null
  }
}

function newPage() {
  if (!canWriteTab(activeTab.value)) return
  store.loadPage(0, newName.value || '未命名大屏', {
    width: 1920,
    height: 1080,
    components: [],
  }, activeTab.value)
  emit('close')
}

function startEdit(scope: PageScope, p: PageListItem, e: Event) {
  e.stopPropagation()
  if (isListItemReadOnly(scope)) return
  editingScope.value = scope
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
  const scope = editingScope.value
  if (id === null) return
  const name = editingName.value.trim()
  if (!name) {
    error.value = '名称不能为空'
    return
  }
  busyKey.value = pageKey(scope, id)
  error.value = ''
  try {
    await renamePage(scope, id, name)
    const list = scope === 'draft' ? draftPages : publishPages
    const row = list.value.find((p) => p.id === id)
    if (row) row.name = name
    if (pageId.value === id && pageScope.value === scope) store.setPageName(name)
    cancelEdit()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '重命名失败'
  } finally {
    busyKey.value = ''
  }
}

async function handleCopy(scope: PageScope, id: number, e: Event) {
  e.stopPropagation()
  if (editingId.value !== null) return
  busyKey.value = pageKey(scope, id)
  error.value = ''
  try {
    await copyPage(scope, id)
    await fetchPages()
  } catch {
    error.value = '复制失败'
  } finally {
    busyKey.value = ''
  }
}

async function handlePromote(id: number, e: Event) {
  e.stopPropagation()
  if (editingId.value !== null) return
  busyKey.value = pageKey('draft', id)
  error.value = ''
  try {
    await promotePageFromDraft(id)
    await fetchPages()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '发布失败'
  } finally {
    busyKey.value = ''
  }
}

onMounted(fetchPages)
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" @click.self="emit('close')">
    <div class="bg-[#111d2e] border border-white/10 rounded-xl shadow-2xl shadow-black/50 w-[580px] h-[628px] flex flex-col overflow-hidden">
      <div class="shrink-0 p-4 border-b border-white/10 flex items-center justify-between">
        <h3 class="text-sm font-semibold text-slate-200">打开页面</h3>
        <button class="text-slate-500 hover:text-slate-300 text-lg leading-none" @click="emit('close')">&times;</button>
      </div>

      <div class="shrink-0 px-3 pt-3 flex gap-1 border-b border-white/10">
        <button
          class="text-xs px-3 py-1.5 rounded-t-md border border-b-0 transition-colors"
          :class="activeTab === 'draft'
            ? 'border-indigo-400/40 bg-indigo-500/10 text-indigo-300'
            : 'border-transparent text-slate-500 hover:text-slate-300'"
          @click="switchTab('draft')"
        >
          调试页
        </button>
        <button
          class="text-xs px-3 py-1.5 rounded-t-md border border-b-0 transition-colors"
          :class="activeTab === 'publish'
            ? 'border-emerald-400/40 bg-emerald-500/10 text-emerald-300'
            : 'border-transparent text-slate-500 hover:text-slate-300'"
          @click="switchTab('publish')"
        >
          发布页
        </button>
      </div>

      <div class="h-14 shrink-0 border-b border-white/10 flex items-center px-3">
        <template v-if="canWriteTab(activeTab)">
          <input
            v-model="newName"
            class="flex-1 bg-white/5 border border-white/10 rounded-md px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-indigo-400/50"
            placeholder="新页面名称"
            @keyup.enter="newPage"
          />
          <button
            class="ml-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs px-4 py-1 rounded-md transition-colors shrink-0"
            @click="newPage"
          >
            新建
          </button>
        </template>
        <p v-else class="text-[11px] text-amber-300/90 leading-snug">
          发布环境下调试页仅可查看；请切换到「发布页」编辑，或对调试页执行「发布」。
        </p>
      </div>

      <div class="relative shrink-0 h-[416px] mx-2 mt-2">
        <div
          v-if="error"
          class="absolute top-0 left-0 right-0 z-10 mx-1 px-2 py-1.5 text-xs text-red-400 text-center bg-red-950/95 border border-red-400/20 rounded-md"
        >
          {{ error }}
        </div>
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center text-xs text-slate-500">加载中...</div>
        <div v-else-if="pages.length === 0" class="absolute inset-0 flex items-center justify-center text-xs text-slate-600">暂无页面</div>

        <template v-else>
          <div
            v-for="p in pagedPages"
            :key="pageKey(activeTab, p.id)"
            class="flex items-center gap-2 px-3 h-[52px] rounded-md hover:bg-white/5 cursor-pointer group transition-colors"
            :class="isCurrentOpen(activeTab, p.id) ? 'bg-indigo-500/10 border border-indigo-400/20' : ''"
            @click="openPage(activeTab, p.id)"
          >
              <span class="text-[10px] text-slate-600 font-mono w-10 shrink-0">{{ p.id }}</span>
              <span v-if="isCurrentOpen(activeTab, p.id)" class="w-2 h-2 rounded-full bg-indigo-400 shrink-0" title="当前打开" />

              <div class="flex-1 min-w-0">
                <template v-if="editingId === p.id && editingScope === activeTab">
                  <input
                    v-model="editingName"
                    class="w-full bg-white/10 border border-indigo-400/40 rounded px-2 py-1 text-sm text-slate-100 outline-none focus:ring-1 focus:ring-indigo-400/40"
                    :disabled="busyKey === pageKey(activeTab, p.id)"
                    @click.stop
                    @keyup.enter="saveEdit"
                    @keyup.escape="cancelEdit"
                  />
                </template>
                <template v-else>
                  <div class="text-sm truncate flex items-center gap-1.5" :class="isCurrentOpen(activeTab, p.id) ? 'text-indigo-300 font-semibold' : 'text-slate-200'">
                    <span class="truncate">{{ p.name }}</span>
                    <span
                      v-if="isListItemReadOnly(activeTab)"
                      class="shrink-0 text-[9px] px-1 py-0.5 rounded border border-amber-400/25 bg-amber-500/10 text-amber-300"
                    >
                      只读
                    </span>
                  </div>
                  <div class="text-[10px] text-slate-600">{{ p.createdAt }}</div>
                </template>
              </div>

              <div class="flex items-center gap-1 shrink-0" @click.stop>
                <template v-if="editingId === p.id && editingScope === activeTab">
                  <button
                    class="text-[11px] text-indigo-300 hover:text-indigo-200 px-2 py-0.5 rounded border border-indigo-400/30 disabled:opacity-50"
                    :disabled="busyKey === pageKey(activeTab, p.id)"
                    @click="saveEdit"
                  >
                    保存
                  </button>
                  <button
                    class="text-[11px] text-slate-500 hover:text-slate-300 px-2 py-0.5"
                    :disabled="busyKey === pageKey(activeTab, p.id)"
                    @click="cancelEdit"
                  >
                    取消
                  </button>
                </template>
                <template v-else>
                  <button
                    v-if="activeTab === 'draft'"
                    class="text-[11px] text-emerald-400/80 hover:text-emerald-300 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
                    :disabled="busyKey === pageKey('draft', p.id)"
                    title="发布到线上表"
                    @click="(e) => handlePromote(p.id, e)"
                  >
                    {{ busyKey === pageKey('draft', p.id) ? '…' : '发布' }}
                  </button>
                  <button
                    class="text-[11px] text-slate-500 hover:text-indigo-300 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-40"
                    :disabled="busyKey === pageKey(activeTab, p.id)"
                    title="复制整页"
                    @click="(e) => handleCopy(activeTab, p.id, e)"
                  >
                    {{ busyKey === pageKey(activeTab, p.id) ? '…' : '复制' }}
                  </button>
                  <button
                    v-if="!isListItemReadOnly(activeTab)"
                    class="text-[11px] text-slate-500 hover:text-slate-300 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="编辑名称"
                    @click="(e) => startEdit(activeTab, p, e)"
                  >
                    编辑
                  </button>
                  <button
                    v-if="!isListItemReadOnly(activeTab)"
                    class="text-[11px] text-slate-600 hover:text-red-400 px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    @click="(e) => requestDelete(activeTab, p.id, e)"
                  >
                    删除
                  </button>
                </template>
              </div>
            </div>

          <div
            v-for="i in placeholderCount"
            :key="`placeholder-${activeTab}-${currentPageIndex}-${i}`"
            class="h-[52px] shrink-0"
            aria-hidden="true"
          />
        </template>
      </div>

      <div class="shrink-0 h-11 flex items-center justify-between px-4 border-t border-white/10 bg-[#111d2e]">
          <button
            type="button"
            class="text-[11px] px-2.5 py-1 rounded border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :disabled="loading || pages.length === 0 || currentPageIndex <= 1"
            @click="goPrevPage"
          >
            上一页
          </button>
          <span class="text-[11px] text-slate-500 tabular-nums">
            第 {{ currentPageIndex }} / {{ totalPages }} 页
            <span v-if="pages.length > 0" class="text-slate-600">· 共 {{ pages.length }} 条</span>
          </span>
          <button
            type="button"
            class="text-[11px] px-2.5 py-1 rounded border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            :disabled="loading || pages.length === 0 || currentPageIndex >= totalPages"
            @click="goNextPage"
          >
          下一页
        </button>
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
