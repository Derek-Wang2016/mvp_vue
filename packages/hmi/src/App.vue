<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useHmiStore, normalizeDocument } from './stores/hmiStore'
import { createPublication, createScreen, deletePublication, deleteScreen, getScreen, listPublications, listScreens, publicationUrl, updatePublication, updateScreen, type HmiListItem, type HmiPublicationItem } from './api'
import { createDefaultDocument } from './defaultDocument'
import { bindingCount, deviceJson, withCareColor } from './resolve'
import { getApiBase } from './config'
import { currentPage, LIMITS, type HmiDocument } from './types'

const canvasPalette: { kind: 'shape' | 'card'; type: string; label: string; icon: string }[] = [
  { kind: 'shape', type: 'rect', label: '矩形', icon: 'rectangle' },
  { kind: 'shape', type: 'circle', label: '圆形', icon: 'circle' },
  { kind: 'shape', type: 'line', label: '线条', icon: 'line' },
  { kind: 'shape', type: 'image', label: '图片', icon: 'photo' },
  { kind: 'shape', type: 'icon', label: '图标', icon: 'icons' },
  { kind: 'shape', type: 'button', label: '按钮', icon: 'click' },
  { kind: 'shape', type: 'block', label: '功能块', icon: 'box' },
  { kind: 'card', type: 'card', label: '卡片', icon: 'layout-cards' },
]

const cardPalette: { type: 'label' | 'value' | 'qrcode' | 'split'; label: string; icon: string }[] = [
  { type: 'label', label: '文字', icon: 'heading' },
  { type: 'value', label: '数据', icon: '123' },
  { type: 'qrcode', label: '二维码', icon: 'qrcode' },
  { type: 'split', label: '拆分', icon: 'separator' },
]

function onPaletteDragStart(event: DragEvent, kind: 'shape' | 'card', type: string) {
  const payload = `${kind}:${type}`
  event.dataTransfer?.setData('application/x-hmi-component', payload)
  event.dataTransfer?.setData('text/plain', payload)
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'copy'
}
import TreePanel from './components/TreePanel.vue'
import HmiCanvas from './components/HmiCanvas.vue'
import PropertyPanel from './components/PropertyPanel.vue'
import ImageLibraryDialog from './components/ImageLibraryDialog.vue'
import PublicationThumb from './components/PublicationThumb.vue'
import SampleSourceDialog from './components/SampleSourceDialog.vue'
import { icons } from '@iconify-json/tabler'

function tabler(name: string): string {
  const alias = icons.aliases?.[name]
  const icon = icons.icons[alias?.parent ?? name]
  if (!icon?.body) return ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${icon.body}</svg>`
}

const store = useHmiStore()
store.migrate()
store.doc.sample = { ...createDefaultDocument().sample, ...store.doc.sample }
const { doc, name, selection, screenId, selectedKeys, pageNames } = storeToRefs(store)
const page = computed(() => currentPage(doc.value))

const msg = ref('')
const saving = ref(false)
const open = ref(false)
const screens = ref<HmiListItem[]>([])
const screenDocs = ref<Record<number, HmiDocument>>({})
const showJson = ref(false)
const showImages = ref(false)
const insertData = ref(false)
const insertKey = ref('')
const insertPlace = ref<'row-before' | 'row-after' | 'col-before' | 'col-after'>('col-after')
const showSample = ref(false)
const confirmDelete = ref<HmiListItem | null>(null)
const nameEdit = ref<{ mode: 'rename' | 'copy'; item: HmiListItem; name: string } | null>(null)
const showAddPage = ref(false)
const newPageName = ref('')
const confirmDropPage = ref(false)
const showPublish = ref(false)
const showPublications = ref(false)
const publishDescription = ref('')
const publications = ref<HmiPublicationItem[]>([])
const publicationDocs = ref<Record<number, HmiDocument>>({})
const confirmDropPublication = ref<HmiPublicationItem | null>(null)
const publicationNameEdit = ref<{ item: HmiPublicationItem; name: string } | null>(null)
const showGrid = ref(true)
const showPosition = ref(false)
const contextMenu = ref<{ x: number; y: number; key: string } | null>(null)

onMounted(() => {
  const id = new URLSearchParams(window.location.search).get('id')
  if (id) {
    getScreen(Number(id)).then((row) => store.load(row.id, row.name, row.schemaJson)).catch(() => { msg.value = '加载失败' })
  }
})

const jsonText = computed(() => JSON.stringify(deviceJson(doc.value), null, 2))
const canAlign = computed(() => selectedKeys.value.length >= 2)
const canCopy = computed(() => store.canCopy)
const canPaste = computed(() => store.canPaste)
const lockedMenu = computed(() => {
  const key = contextMenu.value?.key
  if (!key) return false
  if (key.startsWith('s:')) return !!page.value.shapes[Number(key.slice(2))]?.locked
  if (key.startsWith('c:')) return !!page.value.cards[Number(key.slice(2))]?.locked
  return false
})
const selectedShape = computed(() => selection.value?.kind === 'shape' ? page.value.shapes[selection.value.index] : undefined)
const selectedCard = computed(() => {
  if (selection.value?.kind === 'card') return page.value.cards[selection.value.index]
  if (selection.value?.kind === 'item') return page.value.cards[selection.value.card]
  return undefined
})
const selectedItem = computed(() => selection.value?.kind === 'item' ? page.value.cards[selection.value.card]?.items[selection.value.index] : undefined)

function note(error: string | null) {
  msg.value = error ?? ''
}

async function save() {
  saving.value = true
  msg.value = ''
  try {
    if (screenId.value) await updateScreen(screenId.value, name.value, doc.value)
    else store.screenId = (await createScreen(name.value, doc.value)).id
    msg.value = '已保存'
  } catch {
    msg.value = '保存失败，请确认后端已启动'
  } finally {
    saving.value = false
  }
}

async function loadScreenPreviews(items: HmiListItem[]) {
  const loaded = await Promise.all(items.map(async (item) => {
    if (item.id === screenId.value) return [item.id, doc.value] as const
    try {
      const row = await getScreen(item.id)
      return [item.id, normalizeDocument(row.schemaJson)] as const
    } catch {
      return null
    }
  }))
  const next: Record<number, HmiDocument> = {}
  for (const entry of loaded) {
    if (entry) next[entry[0]] = entry[1]
  }
  screenDocs.value = next
}

async function openList() {
  open.value = true
  try {
    screens.value = await listScreens()
    await loadScreenPreviews(screens.value)
  } catch {
    msg.value = '无法读取列表'
    screens.value = []
  }
}

async function pick(item: HmiListItem) {
  const row = await getScreen(item.id)
  store.load(row.id, row.name, row.schemaJson)
  open.value = false
}

async function confirmRemove() {
  if (!confirmDelete.value) return
  await deleteScreen(confirmDelete.value.id)
  if (screenId.value === confirmDelete.value.id) store.reset()
  confirmDelete.value = null
  screens.value = await listScreens()
  await loadScreenPreviews(screens.value)
}

function screenSize(doc: HmiDocument | undefined) {
  if (!doc?.screen) return ''
  return `${doc.screen.w}×${doc.screen.h}`
}

function formatScreenTime(iso: string) {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleString('zh-CN', { hour12: false })
}

function uniqueScreenName(base: string) {
  const used = new Set(screens.value.map((item) => item.name))
  if (!used.has(base)) return base
  let n = 2
  while (used.has(`${base} ${n}`)) n += 1
  return `${base} ${n}`
}

function startRename(item: HmiListItem) {
  nameEdit.value = { mode: 'rename', item, name: item.name }
}

function startCopy(item: HmiListItem) {
  nameEdit.value = { mode: 'copy', item, name: uniqueScreenName(`${item.name} 副本`) }
}

async function applyNameEdit() {
  const edit = nameEdit.value
  if (!edit) return
  const nextName = edit.name.trim()
  if (!nextName) {
    msg.value = '请填写屏幕名称'
    return
  }
  const duplicated = screens.value.some((item) => item.name === nextName && (edit.mode === 'copy' || item.id !== edit.item.id))
  if (duplicated) {
    msg.value = '已有同名屏幕'
    return
  }
  try {
    if (edit.mode === 'rename') {
      const schema = edit.item.id === screenId.value ? doc.value : (await getScreen(edit.item.id)).schemaJson
      await updateScreen(edit.item.id, nextName, schema)
      if (edit.item.id === screenId.value) name.value = nextName
      msg.value = '已改名'
    } else {
      const schema = edit.item.id === screenId.value ? doc.value : (await getScreen(edit.item.id)).schemaJson
      await createScreen(nextName, schema)
      msg.value = '已复制'
    }
    nameEdit.value = null
    screens.value = await listScreens()
    await loadScreenPreviews(screens.value)
  } catch {
    msg.value = edit.mode === 'rename' ? '改名失败，请确认后端已启动' : '复制失败，请确认后端已启动'
  }
}

function editSample() {
  showSample.value = true
}

function applySamplePayload(data: unknown) {
  try {
    const parsed = (data ?? {}) as Record<string, unknown>
    const row = Array.isArray(parsed.obj) ? ((parsed.obj[0] as Record<string, unknown>) ?? {}) : parsed
    doc.value.sample = { ...createDefaultDocument().sample, ...row }
    doc.value.colors = withCareColor(doc.value.colors, row)
    msg.value = '已激活样例'
  } catch {
    msg.value = '样例 JSON 无法解析'
  }
}

async function loadPublicationDocs(items: HmiPublicationItem[]) {
  const ids = [...new Set(items.map((item) => item.screenId).filter((id): id is number => id != null))]
  const loaded = await Promise.all(ids.map(async (id) => {
    if (publicationDocs.value[id]) return null
    try {
      const row = await getScreen(id)
      return [id, normalizeDocument(row.schemaJson)] as const
    } catch {
      return null
    }
  }))
  const next = { ...publicationDocs.value }
  for (const entry of loaded) {
    if (entry) next[entry[0]] = entry[1]
  }
  publicationDocs.value = next
}

async function openPublications() {
  updateNote.value = {}
  showPublications.value = true
  try {
    publications.value = await listPublications()
    await loadPublicationDocs(publications.value)
  } catch {
    msg.value = '无法读取发布列表'
    publications.value = []
  }
}

function openPublish() {
  publishDescription.value = name.value
  showPublish.value = true
}

async function publish() {
  const description = publishDescription.value.trim()
  if (!description) {
    msg.value = '请填写界面描述'
    return
  }
  saving.value = true
  try {
    await createPublication(description, deviceJson(doc.value), screenId.value)
    publishDescription.value = ''
    showPublish.value = false
    msg.value = '已发布'
    if (showPublications.value) {
      publications.value = await listPublications()
      await loadPublicationDocs(publications.value)
    }
  } catch {
    msg.value = '发布失败，请确认后端已启动'
  } finally {
    saving.value = false
  }
}

async function setPublicationStatus(item: HmiPublicationItem) {
  const status = item.status === 'active' ? 'paused' : 'active'
  await updatePublication(item.id, { status })
  publications.value = await listPublications()
}

const updateNote = ref<Record<number, string>>({})

async function refreshPublication(item: HmiPublicationItem) {
  const result = await updatePublication(item.id, { schemaJson: deviceJson(doc.value) })
  if (item.screenId != null) {
    publicationDocs.value = { ...publicationDocs.value, [item.screenId]: doc.value }
  }
  publications.value = await listPublications()
  updateNote.value = { ...updateNote.value, [item.id]: result.unchanged ? '无改动' : '已更新' }
}

function startRenamePublication(item: HmiPublicationItem) {
  publicationNameEdit.value = { item, name: item.description }
}

async function applyPublicationName() {
  const edit = publicationNameEdit.value
  if (!edit) return
  const next = edit.name.trim()
  if (!next) {
    msg.value = '请填写发布名称'
    return
  }
  try {
    await updatePublication(edit.item.id, { description: next })
    publicationNameEdit.value = null
    publications.value = await listPublications()
    msg.value = '已改名'
  } catch {
    msg.value = '改名失败，请确认后端已启动'
  }
}

async function removePublication() {
  if (!confirmDropPublication.value) return
  await deletePublication(confirmDropPublication.value.id)
  confirmDropPublication.value = null
  publications.value = await listPublications()
}

const copiedId = ref<number | null>(null)

function copyText(text: string): boolean {
  const area = document.createElement('textarea')
  area.value = text
  area.setAttribute('readonly', '')
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  document.body.appendChild(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  return ok
}

function copyApi(id: number) {
  const text = publicationUrl(id)
  const legacy = copyText(text)
  const modern = navigator.clipboard?.writeText(text)
  if (!modern) {
    copiedId.value = legacy ? id : null
    if (!legacy) msg.value = '复制失败'
    return
  }
  void modern.then(() => { copiedId.value = id }).catch(() => {
    copiedId.value = legacy ? id : null
    if (!legacy) msg.value = '复制失败'
  })
  if (legacy) copiedId.value = id
}

async function copyJson() {
  try {
    await navigator.clipboard.writeText(jsonText.value)
    msg.value = '已复制设备 JSON'
  } catch {
    msg.value = '复制失败'
  }
}

function importDoc(text: string) {
  try {
    const parsed = JSON.parse(text) as HmiDocument
    store.load(screenId.value ?? 0, name.value, {
      ...parsed,
      sample: doc.value.sample,
      library: parsed.library ?? doc.value.library,
    })
    if (!screenId.value) store.screenId = null
    msg.value = '已写回'
  } catch {
    msg.value = 'JSON 无法解析'
  }
}

function resizeScreen(w: number, h: number) {
  const width = Math.max(1, Math.round(w) || doc.value.screen.w)
  const height = Math.max(1, Math.round(h) || doc.value.screen.h)
  doc.value.screen = { w: width, h: height }
}

function addPage() {
  const error = store.addPage(newPageName.value)
  if (error) {
    msg.value = error
    return
  }
  newPageName.value = ''
  showAddPage.value = false
}

function openInsertData() {
  if (!selectedCard.value) return
  insertKey.value = ''
  insertPlace.value = 'col-after'
  insertData.value = true
}

function confirmInsertData() {
  const key = insertKey.value.trim()
  if (!key) {
    msg.value = '请填写 KEY'
    return
  }
  note(store.insertItem('value', { prop: key, place: insertPlace.value }))
  insertData.value = false
}

function removePage() {
  store.removePage(doc.value.active)
  confirmDropPage.value = false
}
</script>

<template>
  <div class="flex h-screen flex-col">
    <header class="flex flex-wrap items-center gap-2 border-b border-slate-700 px-3 py-2">
      <span class="text-sm text-slate-400">LVGL HMI</span>
      <input v-model="name" class="w-48 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm" />
      <label class="text-xs text-slate-400">页面
        <select class="ml-1 rounded border border-slate-600 bg-slate-950 px-1 py-1" :value="doc.active" @change="store.showPage(($event.target as HTMLSelectElement).value)">
          <option v-for="pageName in pageNames" :key="pageName" :value="pageName">{{ pageName }}</option>
        </select>
      </label>
      <button class="icon-btn" title="添加页面" @click="showAddPage = true" v-html="tabler('file-plus')" />
      <button v-if="doc.active !== 'index'" class="icon-btn text-rose-300" title="删除页面" @click="confirmDropPage = true" v-html="tabler('file-minus')" />
      <button class="icon-btn" title="新建" @click="store.reset()" v-html="tabler('file')" />
      <button class="icon-btn" title="打开" @click="openList" v-html="tabler('folder-open')" />
      <button class="icon-btn" :title="saving ? '保存中' : '保存'" :disabled="saving" @click="save" v-html="tabler('device-floppy')" />
      <button class="icon-btn" title="发布" @click="openPublish" v-html="tabler('upload')" />
      <button class="icon-btn" title="发布管理" @click="openPublications" v-html="tabler('list-details')" />
      <button class="icon-btn" title="图片" @click="showImages = true" v-html="tabler('photo')" />
      <button class="icon-btn" title="设备 JSON" @click="showJson = true" v-html="tabler('braces')" />
      <button class="icon-btn" title="样例数据" @click="editSample" v-html="tabler('database')" />
      <button class="icon-btn" :class="showGrid ? 'text-sky-300' : ''" title="网格" @click="showGrid = !showGrid" v-html="tabler('grid-dots')" />
      <button class="icon-btn" :class="showPosition ? 'text-sky-300' : ''" title="位置" @click="showPosition = !showPosition" v-html="tabler('crosshair')" />
      <span class="text-xs text-slate-500">卡片 {{ page.cards.length }} · 绑定 {{ bindingCount(doc) }}/{{ LIMITS.bindings }}</span>
      <span class="mx-1 h-4 w-px bg-slate-700" />
      <button class="icon-btn" title="左对齐" :disabled="!canAlign" @click="store.align('left')" v-html="tabler('layout-align-left')" />
      <button class="icon-btn" title="右对齐" :disabled="!canAlign" @click="store.align('right')" v-html="tabler('layout-align-right')" />
      <button class="icon-btn" title="上对齐" :disabled="!canAlign" @click="store.align('top')" v-html="tabler('layout-align-top')" />
      <button class="icon-btn" title="下对齐" :disabled="!canAlign" @click="store.align('bottom')" v-html="tabler('layout-align-bottom')" />
      <button class="icon-btn" title="垂直居中" :disabled="!canAlign" @click="store.align('centerX')" v-html="tabler('layout-align-center')" />
      <button class="icon-btn" title="水平居中" :disabled="!canAlign" @click="store.align('centerY')" v-html="tabler('layout-align-middle')" />
      <button class="icon-btn" title="等宽" :disabled="!canAlign" @click="store.align('equalW')" v-html="tabler('layout-columns')" />
      <button class="icon-btn" title="等高" :disabled="!canAlign" @click="store.align('equalH')" v-html="tabler('layout-rows')" />
      <button class="icon-btn" title="水平等距" :disabled="!canAlign" @click="store.distribute('x')" v-html="tabler('layout-distribute-horizontal')" />
      <button class="icon-btn" title="垂直等距" :disabled="!canAlign" @click="store.distribute('y')" v-html="tabler('layout-distribute-vertical')" />
      <span class="text-xs text-emerald-400">{{ msg }}</span>
    </header>
    <div class="flex min-h-0 flex-1">
      <aside class="flex w-64 flex-col border-r border-slate-700">
        <div class="border-b border-slate-700 p-2">
          <p class="mb-1 text-[10px] text-slate-500">拖到画布</p>
          <div class="grid grid-cols-3 gap-1">
            <button
              v-for="item in canvasPalette"
              :key="item.type"
              type="button"
              class="palette-item cursor-grab active:cursor-grabbing"
              draggable="true"
              title="拖到画布上放置"
              @dragstart="onPaletteDragStart($event, item.kind, item.type)"
            >
              <span v-html="tabler(item.icon)" />
              <span>{{ item.label }}</span>
            </button>
          </div>
          <p class="mb-1 mt-2 text-[10px] text-slate-500">放入选中的卡片</p>
          <div class="grid grid-cols-3 gap-1">
            <button
              v-for="item in cardPalette"
              :key="item.type"
              type="button"
              class="palette-item"
              :disabled="!selectedCard"
              :title="item.type === 'value' ? (selectedCard ? '填写 KEY 和插入位置' : '先选中一张卡片') : '放入当前卡片'"
              @click="item.type === 'value' ? openInsertData() : note(store.addItem(item.type))"
            >
              <span v-html="tabler(item.icon)" />
              <span>{{ item.label }}</span>
            </button>
          </div>
          <div class="mt-3 border-t border-slate-700 pt-2">
            <p class="mb-1 text-[10px] text-slate-500">操作</p>
            <div class="grid grid-cols-3 gap-1">
              <button type="button" class="palette-item" title="页面属性" @click="store.clearSelection()">
                <span v-html="tabler('adjustments-horizontal')" />
                <span>属性</span>
              </button>
              <button type="button" class="palette-item text-rose-300" title="删除选中" @click="store.removeSelected()">
                <span v-html="tabler('trash')" />
                <span>删除</span>
              </button>
            </div>
          </div>
        </div>
        <div class="editor-scrollbar min-h-0 flex-1 overflow-auto p-2">
          <TreePanel :shapes="page.shapes" :cards="page.cards" :selection="selection" @select="store.select" />
        </div>
      </aside>
      <main class="flex min-w-0 flex-1">
        <HmiCanvas :show-grid="showGrid" :show-position="showPosition" @notice="note" @contextmenu="(event, key) => { contextMenu = { x: event.clientX, y: event.clientY, key } }" />
      </main>
      <aside class="editor-scrollbar w-72 overflow-auto border-l border-slate-700">
        <div v-if="selection?.kind === 'shape'" class="flex gap-2 p-2">
          <button class="btn" @click="store.swapShape(selection.index, -1)">下移一层</button>
          <button class="btn" @click="store.swapShape(selection.index, 1)">上移一层</button>
        </div>
        <div v-else-if="selection?.kind === 'card'" class="flex gap-2 p-2">
          <button class="btn" @click="store.swapCard(selection.index, -1)">下移一层</button>
          <button class="btn" @click="store.swapCard(selection.index, 1)">上移一层</button>
        </div>
        <PropertyPanel
          :selection="selection"
          :shape="selectedShape"
          :card="selectedCard"
          :item="selectedItem"
          :screen="doc.screen"
          :page="page"
          :colors="doc.colors"
          :icons="doc.icons"
          :library="doc.library"
          :pages="pageNames"
          @patch-screen="resizeScreen"
          @patch-page="store.patchPage"
          @patch-colors="store.setColors"
          @patch-icons="store.setIcons"
          @patch-library="store.setLibrary"
          @patch-shape="selection?.kind === 'shape' && store.patchShape(selection.index, $event as Partial<HmiShape>)"
          @patch-card="selectedCard && store.patchCard(selection?.kind === 'item' ? selection.card : (selection?.kind === 'card' ? selection.index : -1), $event)"
          @patch-item="selection?.kind === 'item' && store.patchItem(selection.card, selection.index, $event)"
        />
      </aside>
    </div>

    <div v-if="contextMenu" class="fixed z-50 min-w-[140px] rounded-lg border border-white/10 bg-slate-900 py-1 shadow-xl" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }" @click.stop>
      <button class="menu" :disabled="!canCopy" @click="store.copySelected(); contextMenu = null">拷贝 <span class="float-right text-xs text-slate-500">Ctrl+C</span></button>
      <button class="menu" :disabled="!canCopy" @click="store.cutSelected(); contextMenu = null">剪切 <span class="float-right text-xs text-slate-500">Ctrl+X</span></button>
      <button class="menu" :disabled="!canPaste" @click="store.paste(); contextMenu = null">粘贴 <span class="float-right text-xs text-slate-500">Ctrl+V</span></button>
      <button class="menu" @click="store.toggleLock(contextMenu.key); contextMenu = null">{{ lockedMenu ? '解锁' : '锁定' }}</button>
      <div class="my-1 border-t border-white/10" />
      <button class="menu" :disabled="!canAlign" @click="store.align('left'); contextMenu = null">左对齐</button>
      <button class="menu" :disabled="!canAlign" @click="store.align('right'); contextMenu = null">右对齐</button>
      <button class="menu" :disabled="!canAlign" @click="store.align('top'); contextMenu = null">上对齐</button>
      <button class="menu" :disabled="!canAlign" @click="store.align('bottom'); contextMenu = null">下对齐</button>
      <button class="menu" :disabled="!canAlign" @click="store.align('centerX'); contextMenu = null">垂直居中</button>
      <button class="menu" :disabled="!canAlign" @click="store.align('centerY'); contextMenu = null">水平居中</button>
      <button class="menu" :disabled="!canAlign" @click="store.align('equalW'); contextMenu = null">等宽</button>
      <button class="menu" :disabled="!canAlign" @click="store.align('equalH'); contextMenu = null">等高</button>
      <button class="menu" :disabled="!canAlign" @click="store.distribute('x'); contextMenu = null">水平等距</button>
      <button class="menu" :disabled="!canAlign" @click="store.distribute('y'); contextMenu = null">垂直等距</button>
      <div class="my-1 border-t border-white/10" />
      <button class="menu" @click="store.bring(contextMenu.key, 1); contextMenu = null">上移一层</button>
      <button class="menu" @click="store.bring(contextMenu.key, -1); contextMenu = null">下移一层</button>
      <button class="menu text-rose-300" @click="store.removeSelected(); contextMenu = null">删除</button>
    </div>
    <div v-if="contextMenu" class="fixed inset-0 z-40" @pointerdown="contextMenu = null" />
    <div v-if="open" class="overlay" @click.self="open = false">
      <div class="dialog pub-dialog">
        <div class="mb-3 flex items-center justify-between"><span>打开屏幕</span><button type="button" class="icon-btn" title="关闭" @click="open = false" v-html="tabler('x')" /></div>
        <ul class="editor-scrollbar min-h-0 flex-1 space-y-3 overflow-auto">
          <li v-for="item in screens" :key="item.id" class="flex gap-3 rounded border border-slate-700 p-3" :class="item.id === screenId ? 'border-sky-500' : ''">
            <button type="button" class="shrink-0" @click="pick(item)">
              <PublicationThumb v-if="screenDocs[item.id]" :doc="screenDocs[item.id]" />
              <div v-else class="flex h-[188px] w-[320px] items-center justify-center rounded bg-slate-950 text-xs text-slate-500">无预览</div>
            </button>
            <div class="flex min-w-0 flex-1 flex-col">
              <button type="button" class="truncate text-left text-base" @click="pick(item)">{{ item.name }}</button>
              <div class="mt-1 text-xs text-slate-500">{{ screenSize(screenDocs[item.id]) }}<span v-if="screenSize(screenDocs[item.id])"> · </span>{{ formatScreenTime(item.updatedAt) }}</div>
              <div class="mt-auto flex flex-wrap justify-end gap-1 pt-3">
                <button class="btn" @click="pick(item)">打开</button>
                <button class="btn" @click="startRename(item)">改名</button>
                <button class="btn" @click="startCopy(item)">复制</button>
                <button class="btn text-rose-300" @click="confirmDelete = item">删除</button>
              </div>
            </div>
          </li>
          <li v-if="!screens.length" class="text-slate-500">没有已保存的屏幕</li>
        </ul>
      </div>
    </div>
    <div v-if="nameEdit" class="overlay" @click.self="nameEdit = null">
      <div class="dialog">
        <div class="mb-2">{{ nameEdit.mode === 'rename' ? '改名' : '复制屏幕' }}</div>
        <input v-model="nameEdit.name" class="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1" @keyup.enter="applyNameEdit" />
        <div class="mt-3 flex justify-end gap-2">
          <button class="btn" @click="nameEdit = null">取消</button>
          <button class="btn" @click="applyNameEdit">确定</button>
        </div>
      </div>
    </div>
    <div v-if="confirmDelete" class="overlay" @click.self="confirmDelete = null">
      <div class="dialog">
        <p>删除「{{ confirmDelete.name }}」？</p>
        <div class="mt-3 flex justify-end gap-2">
          <button class="btn" @click="confirmDelete = null">取消</button>
          <button class="btn text-rose-300" @click="confirmRemove">删除</button>
        </div>
      </div>
    </div>
    <ImageLibraryDialog v-if="showImages" @close="showImages = false" />
    <div v-if="showJson" class="overlay" @click.self="showJson = false">
      <div class="dialog json-dialog">
        <div class="mb-2 flex items-center justify-between gap-3">
          <span class="text-xs text-slate-400">version 3：screen、colors、icons、pages。index 为启动页</span>
          <span class="flex shrink-0 gap-1">
            <button type="button" class="icon-btn" title="复制" @click="copyJson" v-html="tabler('copy')" />
            <button type="button" class="icon-btn" title="关闭" @click="showJson = false" v-html="tabler('x')" />
          </span>
        </div>
        <textarea class="editor-scrollbar h-[70vh] w-full rounded bg-slate-950 p-2 font-mono text-xs" :value="jsonText" @change="importDoc(($event.target as HTMLTextAreaElement).value)" />
      </div>
    </div>
    <div v-if="insertData" class="overlay" @click.self="insertData = false">
      <div class="dialog text-[12px]">
        <div class="mb-2 text-sm text-slate-200">插入数据</div>
        <label class="block text-slate-400">KEY
          <input v-model="insertKey" class="field mt-1" placeholder="例如 PATIENT_NAME" @keyup.enter="confirmInsertData" />
        </label>
        <div class="mt-3 grid grid-cols-2 gap-1">
          <button type="button" class="btn" :class="insertPlace === 'col-before' ? 'text-sky-300' : ''" @click="insertPlace = 'col-before'">左一列</button>
          <button type="button" class="btn" :class="insertPlace === 'col-after' ? 'text-sky-300' : ''" @click="insertPlace = 'col-after'">右一列</button>
          <button type="button" class="btn" :class="insertPlace === 'row-before' ? 'text-sky-300' : ''" @click="insertPlace = 'row-before'">上一行</button>
          <button type="button" class="btn" :class="insertPlace === 'row-after' ? 'text-sky-300' : ''" @click="insertPlace = 'row-after'">下一行</button>
        </div>
        <p class="mt-2 text-[11px] text-slate-500">相对当前选中的格子插入，并同步增加行或列。没选中格子时加在末尾。</p>
        <div class="mt-3 flex justify-end gap-2">
          <button type="button" class="btn" @click="insertData = false">取消</button>
          <button type="button" class="btn" @click="confirmInsertData">插入</button>
        </div>
      </div>
    </div>
    <div v-if="showAddPage" class="overlay" @click.self="showAddPage = false">
      <div class="dialog">
        <div class="mb-2">添加页面</div>
        <input v-model="newPageName" class="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1" placeholder="例如 detail" @keyup.enter="addPage" />
        <div class="mt-3 flex justify-end gap-2">
          <button class="btn" @click="showAddPage = false">取消</button>
          <button class="btn" @click="addPage">添加</button>
        </div>
      </div>
    </div>
    <div v-if="confirmDropPage" class="overlay" @click.self="confirmDropPage = false">
      <div class="dialog">
        <p>删除页面「{{ doc.active }}」？index 会继续作为启动页。</p>
        <div class="mt-3 flex justify-end gap-2">
          <button class="btn" @click="confirmDropPage = false">取消</button>
          <button class="btn text-rose-300" @click="removePage">删除</button>
        </div>
      </div>
    </div>
    <div v-if="showPublish" class="overlay" @click.self="showPublish = false">
      <div class="dialog">
        <div class="mb-2">发布当前页面</div>
        <label class="block text-sm">界面描述
          <textarea v-model="publishDescription" maxlength="200" class="editor-scrollbar mt-1 h-24 w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm" placeholder="例如 1024×600 床头卡" />
        </label>
        <div class="mt-3 flex justify-end gap-2">
          <button class="btn" @click="showPublish = false">取消</button>
          <button class="btn" :disabled="saving" @click="publish">发布</button>
        </div>
      </div>
    </div>
    <div v-if="showPublications" class="overlay" @click.self="showPublications = false">
      <div class="dialog pub-dialog">
        <div class="mb-3 flex items-center justify-between"><span>发布管理</span><button type="button" class="icon-btn" title="关闭" @click="showPublications = false" v-html="tabler('x')" /></div>
        <ul class="editor-scrollbar min-h-0 flex-1 space-y-3 overflow-auto">
          <li v-for="item in publications" :key="item.id" class="flex gap-3 rounded border p-3 text-sm" :class="item.screenId != null && item.screenId === screenId ? 'border-sky-400 bg-sky-500/10 shadow-[0_0_0_1px_rgba(56,189,248,0.45)]' : 'border-slate-700'">
            <PublicationThumb v-if="item.screenId != null && publicationDocs[item.screenId]" :doc="publicationDocs[item.screenId]" />
            <div v-else class="flex h-[188px] w-[320px] shrink-0 items-center justify-center rounded bg-slate-950 text-xs text-slate-500">无缩略图</div>
            <div class="flex min-w-0 flex-1 flex-col">
              <div class="flex min-w-0 items-center gap-2">
                <div class="truncate text-base">{{ item.description }}</div>
                <span v-if="item.screenId != null && item.screenId === screenId" class="shrink-0 rounded bg-sky-500 px-1.5 py-0.5 text-[11px] text-slate-950">当前屏幕</span>
              </div>
              <div class="mt-1 text-xs text-slate-500">{{ item.screenId != null ? screenSize(publicationDocs[item.screenId]) : '' }}</div>
              <div class="mt-1 truncate font-mono text-xs text-slate-500">{{ publicationUrl(item.id) }}</div>
              <div class="mt-1 text-xs" :class="item.status === 'active' ? 'text-emerald-400' : 'text-amber-300'">{{ item.status === 'active' ? '发布中' : '已暂停' }}</div>
              <div v-if="updateNote[item.id]" class="text-xs" :class="updateNote[item.id] === '无改动' ? 'text-slate-400' : 'text-emerald-400'">{{ updateNote[item.id] }}</div>
              <div class="mt-auto flex flex-wrap justify-end gap-1 pt-3">
                <button class="btn" @click="copyApi(item.id)">{{ copiedId === item.id ? '已复制' : '复制地址' }}</button>
                <button class="btn" @click="startRenamePublication(item)">改名</button>
                <button class="btn" @click="refreshPublication(item)">更新</button>
                <button class="btn" @click="setPublicationStatus(item)">{{ item.status === 'active' ? '暂停' : '恢复' }}</button>
                <button class="btn text-rose-300" @click="confirmDropPublication = item">删除</button>
              </div>
            </div>
          </li>
          <li v-if="!publications.length" class="text-slate-500">还没有发布</li>
        </ul>
      </div>
    </div>
    <div v-if="publicationNameEdit" class="overlay z-[60]" @click.self="publicationNameEdit = null">
      <div class="dialog">
        <div class="mb-2">修改发布名称</div>
        <input v-model="publicationNameEdit.name" maxlength="200" class="w-full rounded border border-slate-600 bg-slate-950 px-2 py-1" @keyup.enter="applyPublicationName" />
        <div class="mt-3 flex justify-end gap-2">
          <button class="btn" @click="publicationNameEdit = null">取消</button>
          <button class="btn" @click="applyPublicationName">确定</button>
        </div>
      </div>
    </div>
    <div v-if="confirmDropPublication" class="overlay z-50" @click.self="confirmDropPublication = null">
      <div class="dialog">
        <p>删除发布「{{ confirmDropPublication.description }}」？对应 API 将不可用。</p>
        <div class="mt-3 flex justify-end gap-2">
          <button class="btn" @click="confirmDropPublication = null">取消</button>
          <button class="btn text-rose-300" @click="removePublication">删除</button>
        </div>
      </div>
    </div>
    <SampleSourceDialog v-if="showSample" @close="showSample = false" @apply="applySamplePayload" />
  </div>
</template>

<style scoped>
.btn { border-radius: 4px; background: rgb(30 41 59); padding: 4px 8px; font-size: 12px; }
.btn:hover { background: rgb(51 65 85); }
.field { margin-top: 4px; width: 100%; border-radius: 6px; border: 1px solid rgb(255 255 255 / 0.15); background: rgb(255 255 255 / 0.08); padding: 6px 10px; font-size: 12px; color: rgb(241 245 249); outline: none; }
.palette-item { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; min-height: 44px; border-radius: 6px; border: 1px solid rgb(255 255 255 / 0.1); background: rgb(255 255 255 / 0.05); padding: 4px 2px; font-size: 11px; color: rgb(203 213 225); }
.palette-item:hover { background: rgb(51 65 85); color: white; }
.palette-item:disabled { opacity: 0.35; cursor: not-allowed; }
.palette-item:disabled:hover { background: rgb(255 255 255 / 0.05); color: rgb(203 213 225); }
.icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 26px; border-radius: 4px; background: rgb(30 41 59); color: rgb(203 213 225); }
.icon-btn:hover { background: rgb(51 65 85); color: white; }
.icon-btn:disabled { opacity: 0.4; }
.menu { display: block; width: 100%; padding: 6px 12px; text-align: left; font-size: 13px; }
.menu:hover { background: rgb(255 255 255 / 0.08); }
.menu:disabled { opacity: 0.4; }
.overlay { position: fixed; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; background: rgb(0 0 0 / 0.55); }
.dialog { width: 420px; border-radius: 8px; border: 1px solid rgb(51 65 85); background: rgb(15 23 42); padding: 16px; }
.pub-dialog { display: flex; width: min(1080px, 94vw); max-height: 86vh; flex-direction: column; }
.json-dialog { width: min(1100px, 94vw); }
</style>
