<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue'
import { useEditorStore } from './stores/editorStore'
import { storeToRefs } from 'pinia'
import { savePage, updatePage, getPage, listPages } from './api'
import type { PageListItem } from './api'
import ComponentPanel from './components/ComponentPanel.vue'
import Canvas from './components/Canvas.vue'
import PropertyPanel from './components/PropertyPanel.vue'
import OpenDialog from './components/OpenDialog.vue'
import ViewJsonDialog from './components/ViewJsonDialog.vue'

const store = useEditorStore()
const {
  pageName, pageId, canUndo, canRedo, canCopy, canPaste,
  canMoveUp, canMoveDown, canAlign, firstSelectedId,
} = storeToRefs(store)

const saving = ref(false)
const saveMsg = ref('')
const lastSavedAt = ref<string | null>(null)
const dialogOpen = ref(false)
const jsonDialogOpen = ref(false)
const showGrid = ref(true)
const pageOptions = ref<PageListItem[]>([])
const pageOptionsLoading = ref(false)
const savedFingerprint = ref('')

const currentPageId = computed<number | null>(() => (
  pageId.value && pageId.value > 0 ? pageId.value : null
))
const hasUnsavedChanges = computed(() => makeFingerprint() !== savedFingerprint.value)

// Shift key tracking
const shiftRef = ref(false)

// Context menu
interface ContextMenuState {
  x: number; y: number; compId: string
}
const contextMenu = ref<ContextMenuState | null>(null)

// URL ?id= loading + global shortcuts（须挂 window，否则画布选中后根节点无焦点快捷键失效）
onMounted(() => {
  fetchPageOptions()
  const params = new URLSearchParams(window.location.search)
  const id = params.get('id')
  if (id) {
    getPage(Number(id))
      .then((data) => {
        store.loadPage(data.id, data.name, data.schemaJson)
        markSaved()
      })
      .catch(() => { saveMsg.value = '加载失败' })
  } else {
    markSaved()
  }
  window.addEventListener('keydown', handleKeyDown)
  window.addEventListener('keyup', handleKeyUp)
  editorRootRef.value?.focus({ preventScroll: true })
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown)
  window.removeEventListener('keyup', handleKeyUp)
  disarmCloseOnClickOutside()
})

function makeFingerprint() {
  return JSON.stringify({ name: store.pageName, schema: store.toSchema() })
}

function markSaved() {
  savedFingerprint.value = makeFingerprint()
}

async function fetchPageOptions() {
  pageOptionsLoading.value = true
  try {
    pageOptions.value = await listPages()
  } catch {
    // keep existing options if refresh fails
  } finally {
    pageOptionsLoading.value = false
  }
}

const editorRootRef = ref<HTMLElement | null>(null)

// Save
async function handleSave() {
  saving.value = true
  saveMsg.value = ''
  try {
    const schema = store.toSchema()
    const name = store.pageName
    const id = store.pageId
    if (id) {
      await updatePage(id, name, schema)
      saveMsg.value = '已更新'
    } else {
      const result = await savePage(name, schema)
      store.pageId = result.id
      saveMsg.value = '已保存'
    }
    markSaved()
    await fetchPageOptions()
    lastSavedAt.value = new Date().toLocaleString('zh-CN', { hour12: false })
  } catch {
    saveMsg.value = '保存失败'
  } finally {
    saving.value = false
  }
}

async function switchPageById(id: number) {
  const data = await getPage(id)
  store.loadPage(data.id, data.name, data.schemaJson)
  markSaved()
}

async function handlePageSelectChange(e: Event) {
  const selected = Number((e.target as HTMLSelectElement).value)
  if (!Number.isFinite(selected) || selected <= 0 || selected === currentPageId.value) return

  if (hasUnsavedChanges.value) {
    const shouldSave = window.confirm('当前页面有未保存修改。点击“确定”先保存再切换，点击“取消”放弃切换。')
    if (!shouldSave) return
    await handleSave()
    if (hasUnsavedChanges.value) return
  }

  try {
    await switchPageById(selected)
    saveMsg.value = ''
    lastSavedAt.value = null
  } catch {
    saveMsg.value = '切换页面失败'
  }
}

function handleOpenDialogClose() {
  dialogOpen.value = false
  fetchPageOptions()
}

watch(pageId, (next, prev) => {
  if (next !== prev) markSaved()
})

// Context menu
function handleCanvasContextMenu(e: MouseEvent, compId: string) {
  e.preventDefault()
  contextMenu.value = { x: e.clientX, y: e.clientY, compId }
}

function closeContextMenu() {
  contextMenu.value = null
}

let disarmContextMenuClose: (() => void) | null = null

function disarmCloseOnClickOutside() {
  disarmContextMenuClose?.()
  disarmContextMenuClose = null
}

function armCloseOnClickOutside() {
  disarmCloseOnClickOutside()
  const close = () => {
    contextMenu.value = null
    disarmCloseOnClickOutside()
  }
  const onClick = () => close()
  const onContextMenu = () => close()
  window.addEventListener('click', onClick)
  // 须延后注册：否则会立刻捕获「打开菜单」的同一次 contextmenu 冒泡
  void nextTick(() => {
    window.addEventListener('contextmenu', onContextMenu)
  })
  disarmContextMenuClose = () => {
    window.removeEventListener('click', onClick)
    window.removeEventListener('contextmenu', onContextMenu)
  }
}

watch(contextMenu, (val) => {
  if (!val) {
    disarmCloseOnClickOutside()
    return
  }
  armCloseOnClickOutside()
})

function isShortcutMod(e: KeyboardEvent) {
  return e.ctrlKey || e.metaKey
}

function handleKeyUp(e: KeyboardEvent) {
  if (e.key === 'Shift') shiftRef.value = false
}

// Keyboard shortcuts（window 级，支持 Ctrl / Cmd）
function handleKeyDown(e: KeyboardEvent) {
  if (e.key === 'Shift') {
    shiftRef.value = true
    return
  }

  const target = e.target as HTMLElement
  const tag = target.tagName
  const editable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
  const mod = isShortcutMod(e)
  const key = e.key.toLowerCase()

  if (mod && key === 'z' && !e.shiftKey) {
    e.preventDefault(); store.undo(); return
  }
  if ((mod && key === 'z' && e.shiftKey) || (mod && key === 'y')) {
    e.preventDefault(); store.redo(); return
  }
  if (mod && key === 's') {
    e.preventDefault(); handleSave(); return
  }
  if (mod && key === 'c' && !editable) {
    if (store.selectedIds.length > 0) {
      e.preventDefault(); store.copySelectedComponents()
    }
    return
  }
  if (mod && key === 'x' && !editable) {
    if (store.selectedIds.length > 0) {
      e.preventDefault(); store.cutSelectedComponents()
    }
    return
  }
  if (mod && key === 'v' && !editable) {
    if (canPaste.value) {
      e.preventDefault(); store.pasteComponents()
    }
    return
  }
  if ((e.key === 'Delete' || e.key === 'Backspace') && !editable && !mod) {
    if (store.selectedIds.length > 0) {
      e.preventDefault()
      store.removeComponents([...store.selectedIds])
    }
    return
  }

  // 方向键微调位置（Shift 步进 10px，支持多选整体移动）
  if (!editable && !mod && store.selectedIds.length > 0) {
    const step = e.shiftKey ? 10 : 1
    let dx = 0
    let dy = 0
    switch (e.key) {
      case 'ArrowLeft': dx = -step; break
      case 'ArrowRight': dx = step; break
      case 'ArrowUp': dy = -step; break
      case 'ArrowDown': dy = step; break
      default: break
    }
    if (dx !== 0 || dy !== 0) {
      e.preventDefault()
      store.moveComponents([...store.selectedIds], dx, dy)
    }
  }
}


// Toolbar icon: SVG inline
const UndoIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5h5.5a3 3 0 110 6H7"/><polyline points="4 2.5 2 5 4 7.5"/></svg>`
const RedoIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 5H8.5a3 3 0 100 6H9"/><polyline points="12 2.5 14 5 12 7.5"/></svg>`
const CopyIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M3.5 10.5H2.5a1.5 1.5 0 01-1.5-1.5V2.5A1.5 1.5 0 012.5 1h6.5a1.5 1.5 0 011.5 1.5V3.5"/></svg>`
const CutIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><circle cx="4" cy="4" r="2"/><circle cx="12" cy="12" r="2"/><line x1="5.2" y1="5.2" x2="10.8" y2="10.8"/><path d="M9 3.5h3.5V7M7 12.5H3.5V9"/></svg>`
const PasteIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2.5" width="8" height="11" rx="1.5"/><line x1="6" y1="5.5" x2="10" y2="5.5"/><line x1="6" y1="8" x2="10" y2="8"/><line x1="6" y1="10.5" x2="8.5" y2="10.5"/></svg>`
const ToBackIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="10" height="7" rx="1.5"/><line x1="8" y1="11" x2="8" y2="14.5"/><polyline points="5 12.5 8 15 11 12.5"/><line x1="2" y1="15" x2="14" y2="15"/></svg>`
const DownIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="10" height="8" rx="1.5"/><polyline points="5 12.5 8 15 11 12.5"/></svg>`
const UpIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="10" height="8" rx="1.5"/><polyline points="5 3.5 8 1 11 3.5"/></svg>`
const ToFrontIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="6" width="10" height="7" rx="1.5"/><line x1="8" y1="5" x2="8" y2="1.5"/><polyline points="5 3.5 8 1 11 3.5"/><line x1="2" y1="1" x2="14" y2="1"/></svg>`
const AlignLeftIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><line x1="2.5" y1="2" x2="2.5" y2="14"/><rect x="5" y="3.5" width="4" height="3" rx="0.5" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/><rect x="6.5" y="9" width="6" height="3.5" rx="0.5" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/></svg>`
const AlignRightIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><line x1="13.5" y1="2" x2="13.5" y2="14"/><rect x="7" y="3.5" width="4" height="3" rx="0.5" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/><rect x="3.5" y="9" width="6" height="3.5" rx="0.5" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/></svg>`
const AlignTopIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="2.5" x2="14" y2="2.5"/><rect x="3.5" y="5" width="3" height="4" rx="0.5" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/><rect x="9" y="6.5" width="3.5" height="6" rx="0.5" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/></svg>`
const AlignBottomIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><line x1="2" y1="13.5" x2="14" y2="13.5"/><rect x="3.5" y="7" width="3" height="4" rx="0.5" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/><rect x="9" y="3.5" width="3.5" height="6" rx="0.5" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/></svg>`
const EqualWidthIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="2.5" x2="4" y2="13.5"/><line x1="12" y1="2.5" x2="12" y2="13.5"/><rect x="5.5" y="4" width="5" height="3" rx="0.5" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/><rect x="5.5" y="9.5" width="5" height="2.5" rx="0.5" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/></svg>`
const EqualHeightIcon = `<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"><line x1="2.5" y1="4" x2="13.5" y2="4"/><line x1="2.5" y1="12" x2="13.5" y2="12"/><rect x="4" y="5.5" width="3" height="5" rx="0.5" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/><rect x="9.5" y="5.5" width="2.5" height="5" rx="0.5" fill="currentColor" fill-opacity="0.25" stroke="currentColor"/></svg>`

const alignBtnClass = (enabled: boolean) =>
  enabled
    ? 'text-slate-400 border-white/10 bg-white/5 hover:text-slate-200 hover:bg-white/10 hover:border-white/15'
    : 'text-slate-700 border-white/5 bg-white/[0.02] cursor-not-allowed'
</script>

<template>
  <div ref="editorRootRef" class="h-screen flex flex-col outline-none" tabindex="-1" @mousedown="editorRootRef?.focus({ preventScroll: true })">
    <!-- Header / Toolbar -->
    <header class="h-11 border-b border-white/10 flex items-center px-4 text-xs shrink-0 gap-2.5 bg-gradient-to-b from-[#111d2e] to-[#0f1a28]">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2" class="shrink-0">
        <rect x="3" y="3" width="18" height="18" rx="3"/>
        <line x1="9" y1="9" x2="15" y2="9"/>
        <line x1="9" y1="13" x2="15" y2="13"/>
      </svg>
      <span class="text-slate-300 font-semibold tracking-wide">大屏编辑器</span>

      <!-- page switcher -->
      <select
        class="appearance-none bg-[#0f1824] border border-white/15 rounded-md px-2.5 py-0.5 pr-7 text-xs w-52 text-slate-200 shadow-sm shadow-black/10 hover:bg-white/[0.06] hover:border-white/25 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors disabled:opacity-60"
        :value="currentPageId ?? ''"
        :disabled="pageOptionsLoading"
        @change="handlePageSelectChange"
      >
        <option class="bg-[#111d2e] text-slate-200" value="" disabled>{{ pageOptionsLoading ? '页面加载中...' : '选择页面...' }}</option>
        <option v-for="p in pageOptions" :key="p.id" :value="p.id" class="bg-[#111d2e] text-slate-200">
          #{{ p.id }} {{ p.name }}
        </option>
      </select>
      <svg class="-ml-6 h-3.5 w-3.5 pointer-events-none text-slate-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clip-rule="evenodd" />
      </svg>

      <!-- page id -->
      <span
        class="text-[10px] tabular-nums px-2 py-1 rounded-md border border-white/10 bg-white/5 text-slate-400"
        :title="currentPageId ? `当前页面 ID：${currentPageId}` : '当前页面尚未保存（无 ID）'"
      >
        ID: <span class="text-slate-200">{{ currentPageId ?? '未保存' }}</span>
      </span>

      <!-- undo/redo -->
      <button
        class="px-2 py-1 rounded-md border transition-colors"
        :class="canUndo ? 'text-slate-400 border-white/10 bg-white/5 hover:text-slate-200 hover:bg-white/10 hover:border-white/15' : 'text-slate-700 border-white/5 bg-white/[0.02] cursor-not-allowed'"
        :disabled="!canUndo" @click="store.undo()" title="撤销 (Ctrl+Z)"
        v-html="UndoIcon"
      />
      <button
        class="px-2 py-1 rounded-md border transition-colors"
        :class="canRedo ? 'text-slate-400 border-white/10 bg-white/5 hover:text-slate-200 hover:bg-white/10 hover:border-white/15' : 'text-slate-700 border-white/5 bg-white/[0.02] cursor-not-allowed'"
        :disabled="!canRedo" @click="store.redo()" title="重做 (Ctrl+Shift+Z)"
        v-html="RedoIcon"
      />

      <span class="w-px h-4 bg-white/10" />

      <!-- copy/cut/paste -->
      <button
        class="px-2 py-1 rounded-md border transition-colors"
        :class="canCopy ? 'text-slate-400 border-white/10 bg-white/5 hover:text-slate-200 hover:bg-white/10 hover:border-white/15' : 'text-slate-700 border-white/5 bg-white/[0.02] cursor-not-allowed'"
        :disabled="!canCopy" @click="store.copySelectedComponents()" title="拷贝 (Ctrl+C)"
        v-html="CopyIcon"
      />
      <button
        class="px-2 py-1 rounded-md border transition-colors"
        :class="canCopy ? 'text-slate-400 border-white/10 bg-white/5 hover:text-slate-200 hover:bg-white/10 hover:border-white/15' : 'text-slate-700 border-white/5 bg-white/[0.02] cursor-not-allowed'"
        :disabled="!canCopy" @click="store.cutSelectedComponents()" title="剪切 (Ctrl+X)"
        v-html="CutIcon"
      />
      <button
        class="px-2 py-1 rounded-md border transition-colors"
        :class="canPaste ? 'text-slate-400 border-white/10 bg-white/5 hover:text-slate-200 hover:bg-white/10 hover:border-white/15' : 'text-slate-700 border-white/5 bg-white/[0.02] cursor-not-allowed'"
        :disabled="!canPaste" @click="store.pasteComponents()" title="粘贴 (Ctrl+V)"
        v-html="PasteIcon"
      />

      <span class="w-px h-4 bg-white/10" />

      <!-- align (multi-select) -->
      <button
        class="px-2 py-1 rounded-md border transition-colors"
        :class="alignBtnClass(canAlign)"
        :disabled="!canAlign"
        title="左对齐（需选中 2 个及以上组件）"
        v-html="AlignLeftIcon"
        @click="store.alignSelectedComponents('left')"
      />
      <button
        class="px-2 py-1 rounded-md border transition-colors"
        :class="alignBtnClass(canAlign)"
        :disabled="!canAlign"
        title="右对齐（需选中 2 个及以上组件）"
        v-html="AlignRightIcon"
        @click="store.alignSelectedComponents('right')"
      />
      <button
        class="px-2 py-1 rounded-md border transition-colors"
        :class="alignBtnClass(canAlign)"
        :disabled="!canAlign"
        title="上对齐（需选中 2 个及以上组件）"
        v-html="AlignTopIcon"
        @click="store.alignSelectedComponents('top')"
      />
      <button
        class="px-2 py-1 rounded-md border transition-colors"
        :class="alignBtnClass(canAlign)"
        :disabled="!canAlign"
        title="下对齐（需选中 2 个及以上组件）"
        v-html="AlignBottomIcon"
        @click="store.alignSelectedComponents('bottom')"
      />
      <button
        class="px-2 py-1 rounded-md border transition-colors"
        :class="alignBtnClass(canAlign)"
        :disabled="!canAlign"
        title="等宽（以首个选中组件为基准，需选中 2 个及以上）"
        v-html="EqualWidthIcon"
        @click="store.equalizeSelectedWidth()"
      />
      <button
        class="px-2 py-1 rounded-md border transition-colors"
        :class="alignBtnClass(canAlign)"
        :disabled="!canAlign"
        title="等高（以首个选中组件为基准，需选中 2 个及以上）"
        v-html="EqualHeightIcon"
        @click="store.equalizeSelectedHeight()"
      />

      <span class="w-px h-4 bg-white/10" />

      <!-- layer ops -->
      <button
        class="px-2 py-1 rounded-md border transition-colors"
        :class="canMoveDown ? 'text-slate-400 border-white/10 bg-white/5 hover:text-slate-200 hover:bg-white/10 hover:border-white/15' : 'text-slate-700 border-white/5 bg-white/[0.02] cursor-not-allowed'"
        :disabled="!canMoveDown" @click="firstSelectedId && store.sendToBack(firstSelectedId)" title="置底"
        v-html="ToBackIcon"
      />
      <button
        class="px-2 py-1 rounded-md border transition-colors"
        :class="canMoveDown ? 'text-slate-400 border-white/10 bg-white/5 hover:text-slate-200 hover:bg-white/10 hover:border-white/15' : 'text-slate-700 border-white/5 bg-white/[0.02] cursor-not-allowed'"
        :disabled="!canMoveDown" @click="firstSelectedId && store.sendBackward(firstSelectedId)" title="下一层"
        v-html="DownIcon"
      />
      <button
        class="px-2 py-1 rounded-md border transition-colors"
        :class="canMoveUp ? 'text-slate-400 border-white/10 bg-white/5 hover:text-slate-200 hover:bg-white/10 hover:border-white/15' : 'text-slate-700 border-white/5 bg-white/[0.02] cursor-not-allowed'"
        :disabled="!canMoveUp" @click="firstSelectedId && store.bringForward(firstSelectedId)" title="上一层"
        v-html="UpIcon"
      />
      <button
        class="px-2 py-1 rounded-md border transition-colors"
        :class="canMoveUp ? 'text-slate-400 border-white/10 bg-white/5 hover:text-slate-200 hover:bg-white/10 hover:border-white/15' : 'text-slate-700 border-white/5 bg-white/[0.02] cursor-not-allowed'"
        :disabled="!canMoveUp" @click="firstSelectedId && store.bringToFront(firstSelectedId)" title="置顶"
        v-html="ToFrontIcon"
      />

      <div class="flex-1" />

      <!-- grid toggle -->
      <button
        class="text-xs px-2.5 py-1 rounded-md border transition-colors"
        :class="showGrid ? 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/30 hover:border-indigo-400/50' : 'text-slate-400 border-white/10 bg-white/5 hover:text-slate-200 hover:bg-white/10'"
        @click="showGrid = !showGrid"
      >
        网格
      </button>

      <span class="w-px h-4 bg-white/10" />

      <!-- file ops -->
      <button class="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition-colors" @click="jsonDialogOpen = true">
        JSON
      </button>
      <button class="text-slate-400 hover:text-slate-200 text-xs px-2.5 py-1 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 transition-colors" @click="dialogOpen = true">
        打开
      </button>

      <span v-if="saveMsg" class="text-xs" :class="saveMsg.includes('失败') ? 'text-red-400' : 'text-green-400'">
        {{ saveMsg }}
      </span>
      <span v-if="lastSavedAt" class="text-[10px] text-slate-600 tabular-nums">{{ lastSavedAt }}</span>

      <button
        class="bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs px-4 py-1.5 rounded-md font-medium shadow-sm shadow-indigo-500/25 disabled:opacity-50 transition-all"
        :disabled="saving" @click="handleSave"
      >
        {{ saving ? '保存中...' : '保存' }}
      </button>
    </header>

    <!-- Three-column body -->
    <div class="flex-1 flex overflow-hidden">
      <ComponentPanel />
      <Canvas
        :show-grid="showGrid"
        @contextmenu="handleCanvasContextMenu"
      />
      <PropertyPanel />
    </div>

    <!-- Dialogs -->
    <OpenDialog v-if="dialogOpen" @close="handleOpenDialogClose" />
    <ViewJsonDialog :open="jsonDialogOpen" @close="jsonDialogOpen = false" />

    <!-- Context menu -->
    <div
      v-if="contextMenu"
      class="fixed z-50 bg-[#111d2e]/95 backdrop-blur-sm border border-white/10 rounded-lg shadow-xl shadow-black/40 py-1 min-w-[140px]"
      :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
      @click.stop
      @contextmenu.stop.prevent
    >
      <button class="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" :disabled="!canCopy" @click="store.copySelectedComponents(); closeContextMenu()">
        拷贝 <span class="float-right text-slate-500 text-xs">Ctrl+C</span>
      </button>
      <button class="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" :disabled="!canCopy" @click="store.cutSelectedComponents(); closeContextMenu()">
        剪切 <span class="float-right text-slate-500 text-xs">Ctrl+X</span>
      </button>
      <button class="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed" :disabled="!canPaste" @click="store.pasteComponents(); closeContextMenu()">
        粘贴 <span class="float-right text-slate-500 text-xs">Ctrl+V</span>
      </button>
      <div class="border-t border-white/10 my-1" />
      <button
        class="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!canAlign"
        @click="store.alignSelectedComponents('left'); closeContextMenu()"
      >
        左对齐
      </button>
      <button
        class="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!canAlign"
        @click="store.alignSelectedComponents('right'); closeContextMenu()"
      >
        右对齐
      </button>
      <button
        class="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!canAlign"
        @click="store.alignSelectedComponents('top'); closeContextMenu()"
      >
        上对齐
      </button>
      <button
        class="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!canAlign"
        @click="store.alignSelectedComponents('bottom'); closeContextMenu()"
      >
        下对齐
      </button>
      <button
        class="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!canAlign"
        @click="store.equalizeSelectedWidth(); closeContextMenu()"
      >
        等宽
      </button>
      <button
        class="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        :disabled="!canAlign"
        @click="store.equalizeSelectedHeight(); closeContextMenu()"
      >
        等高
      </button>
      <div class="border-t border-white/10 my-1" />
      <button class="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors" @click="contextMenu && store.bringToFront(contextMenu.compId); closeContextMenu()">置顶</button>
      <button class="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors" @click="contextMenu && store.bringForward(contextMenu.compId); closeContextMenu()">上一层</button>
      <button class="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors" @click="contextMenu && store.sendBackward(contextMenu.compId); closeContextMenu()">下一层</button>
      <button class="w-full text-left px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 transition-colors" @click="contextMenu && store.sendToBack(contextMenu.compId); closeContextMenu()">置底</button>
      <div class="border-t border-white/10 my-1" />
      <button class="w-full text-left px-3 py-1.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors" @click="contextMenu && store.removeComponent(contextMenu.compId); closeContextMenu()">删除组件</button>
    </div>
  </div>
</template>
