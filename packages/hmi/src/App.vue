<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useHmiStore } from './stores/hmiStore'
import { createPublication, createScreen, deletePublication, deleteScreen, getScreen, listPublications, listScreens, publicationUrl, updatePublication, updateScreen, type HmiListItem, type HmiPublicationItem } from './api'
import { createDefaultDocument } from './defaultDocument'
import { bindingCount, deviceJson, withCareColor } from './resolve'
import { getApiBase } from './config'
import { currentPage, LIMITS, type HmiDocument, type HmiShape } from './types'
import TreePanel from './components/TreePanel.vue'
import HmiCanvas from './components/HmiCanvas.vue'
import PropertyPanel from './components/PropertyPanel.vue'

const store = useHmiStore()
store.migrate()
store.doc.sample = { ...createDefaultDocument().sample, ...store.doc.sample }
const { doc, name, selection, screenId, selectedKeys, pageNames } = storeToRefs(store)
const page = computed(() => currentPage(doc.value))

const msg = ref('')
const saving = ref(false)
const open = ref(false)
const screens = ref<HmiListItem[]>([])
const showJson = ref(false)
const showSample = ref(false)
const sampleText = ref('')
const confirmDelete = ref<HmiListItem | null>(null)
const showAddPage = ref(false)
const newPageName = ref('')
const confirmDropPage = ref(false)
const showPublish = ref(false)
const showPublications = ref(false)
const publishDescription = ref('')
const publications = ref<HmiPublicationItem[]>([])
const confirmDropPublication = ref<HmiPublicationItem | null>(null)
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

async function openList() {
  open.value = true
  try { screens.value = await listScreens() } catch { msg.value = '无法读取列表'; screens.value = [] }
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
}

function editSample() {
  sampleText.value = JSON.stringify(doc.value.sample, null, 2)
  showSample.value = true
}

async function loadRandomPatient() {
  try {
    const res = await fetch(`${getApiBase()}/api/demo/hmi-patient`)
    if (!res.ok) throw new Error('bad status')
    const body = await res.json() as Record<string, unknown>
    sampleText.value = JSON.stringify(body, null, 2)
    const row = Array.isArray(body.obj) ? ((body.obj[0] as Record<string, unknown>) ?? {}) : body
    doc.value.sample = { ...createDefaultDocument().sample, ...row }
    doc.value.colors = withCareColor(doc.value.colors, row)
    msg.value = '已填入随机病人'
  } catch {
    msg.value = '随机病人接口失败，请确认后端已启动'
  }
}

function applySample() {
  try {
    const parsed = JSON.parse(sampleText.value) as Record<string, unknown>
    const row = Array.isArray(parsed.obj) ? ((parsed.obj[0] as Record<string, unknown>) ?? {}) : parsed
    doc.value.sample = { ...createDefaultDocument().sample, ...row }
    doc.value.colors = withCareColor(doc.value.colors, row)
    showSample.value = false
  } catch {
    msg.value = '样例 JSON 无法解析'
  }
}

async function openPublications() {
  updateNote.value = {}
  showPublications.value = true
  try { publications.value = await listPublications() } catch { msg.value = '无法读取发布列表'; publications.value = [] }
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
    if (showPublications.value) publications.value = await listPublications()
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
  publications.value = await listPublications()
  updateNote.value = { ...updateNote.value, [item.id]: result.unchanged ? '无改动' : '已更新' }
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
  doc.value.screen = { w, h }
  const bg = page.value.shapes[0]
  if (bg && bg.type === 'rect') {
    bg.w = w
    bg.h = h
  }
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
      <label class="text-xs text-slate-400">宽
        <input class="ml-1 w-16 rounded border border-slate-600 bg-slate-950 px-1" type="number" :value="doc.screen.w" @change="resizeScreen(Number(($event.target as HTMLInputElement).value), doc.screen.h)" />
      </label>
      <label class="text-xs text-slate-400">高
        <input class="ml-1 w-16 rounded border border-slate-600 bg-slate-950 px-1" type="number" :value="doc.screen.h" @change="resizeScreen(doc.screen.w, Number(($event.target as HTMLInputElement).value))" />
      </label>
      <label class="text-xs text-slate-400">页面
        <select class="ml-1 rounded border border-slate-600 bg-slate-950 px-1 py-1" :value="doc.active" @change="store.showPage(($event.target as HTMLSelectElement).value)">
          <option v-for="pageName in pageNames" :key="pageName" :value="pageName">{{ pageName }}</option>
        </select>
      </label>
      <button class="btn" @click="showAddPage = true">添加页面</button>
      <button v-if="doc.active !== 'index'" class="btn text-rose-300" @click="confirmDropPage = true">删除页面</button>
      <button class="btn" @click="store.reset()">新建</button>
      <button class="btn" @click="openList">打开</button>
      <button class="btn" :disabled="saving" @click="save">保存</button>
      <button class="btn" @click="showPublish = true">发布</button>
      <button class="btn" @click="openPublications">发布管理</button>
      <button class="btn" @click="showJson = true">设备 JSON</button>
      <button class="btn" @click="editSample">样例数据</button>
      <button class="btn" :class="showGrid ? 'text-sky-300' : ''" @click="showGrid = !showGrid">网格</button>
      <button class="btn" :class="showPosition ? 'text-sky-300' : ''" @click="showPosition = !showPosition">位置</button>
      <span class="text-xs text-slate-500">卡片 {{ page.cards.length }} · 绑定 {{ bindingCount(doc) }}/{{ LIMITS.bindings }}</span>
      <template v-if="canAlign">
        <span class="mx-1 h-4 w-px bg-slate-700" />
        <button class="btn" title="左对齐" @click="store.align('left')">左</button>
        <button class="btn" title="右对齐" @click="store.align('right')">右</button>
        <button class="btn" title="上对齐" @click="store.align('top')">上</button>
        <button class="btn" title="下对齐" @click="store.align('bottom')">下</button>
        <button class="btn" title="垂直居中" @click="store.align('centerX')">垂直居中</button>
        <button class="btn" title="水平居中" @click="store.align('centerY')">水平居中</button>
        <button class="btn" title="水平等距" @click="store.distribute('x')">水平等距</button>
        <button class="btn" title="垂直等距" @click="store.distribute('y')">垂直等距</button>
      </template>
      <span class="text-xs text-emerald-400">{{ msg }}</span>
    </header>
    <div class="flex min-h-0 flex-1">
      <aside class="flex w-64 flex-col border-r border-slate-700">
        <div class="flex flex-wrap gap-1 border-b border-slate-700 p-2">
          <button class="btn" @click="note(store.addShape('rect'))">矩形</button>
          <button class="btn" @click="note(store.addShape('circle'))">圆形</button>
          <button class="btn" @click="note(store.addShape('line'))">线条</button>
          <button class="btn" @click="note(store.addShape('image'))">图片</button>
          <button class="btn" @click="note(store.addShape('icon'))">图标</button>
          <button class="btn" @click="note(store.addShape('button'))">按钮</button>
          <button class="btn" @click="note(store.addShape('block'))">功能块</button>
          <button class="btn" @click="note(store.addCard())">卡片</button>
          <button class="btn" @click="note(store.addItem('label'))">标题</button>
          <button class="btn" @click="note(store.addItem('value'))">数值</button>
          <button class="btn" @click="note(store.addItem('qrcode'))">二维码</button>
          <button class="btn" @click="store.clearSelection()">字典</button>
          <button class="btn" @click="note(store.addItem('split'))">拆分</button>
          <button class="btn text-rose-300" @click="store.removeSelected()">删除</button>
        </div>
        <div class="editor-scrollbar min-h-0 flex-1 overflow-auto p-2">
          <TreePanel :shapes="page.shapes" :cards="page.cards" :selection="selection" @select="store.select" />
        </div>
      </aside>
      <main class="flex min-w-0 flex-1">
        <HmiCanvas :show-grid="showGrid" :show-position="showPosition" @contextmenu="(event, key) => { contextMenu = { x: event.clientX, y: event.clientY, key } }" />
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
          :colors="doc.colors"
          :icons="doc.icons"
          :library="doc.library"
          :pages="pageNames"
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
      <div class="dialog">
        <div class="mb-2 flex justify-between"><span>打开屏幕</span><button @click="open = false">关闭</button></div>
        <ul class="editor-scrollbar max-h-80 space-y-1 overflow-auto">
          <li v-for="item in screens" :key="item.id" class="flex items-center justify-between rounded px-2 py-1 hover:bg-slate-800">
            <button @click="pick(item)">{{ item.name }}</button>
            <button class="text-rose-300" @click="confirmDelete = item">删除</button>
          </li>
          <li v-if="!screens.length" class="text-slate-500">没有已保存的屏幕</li>
        </ul>
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
    <div v-if="showJson" class="overlay" @click.self="showJson = false">
      <div class="dialog w-[720px]">
        <div class="mb-2 flex justify-between"><span>version 3：screen、colors、icons、pages。index 为启动页</span>
          <span class="flex gap-2">
            <button class="btn" @click="copyJson">复制</button>
            <button @click="showJson = false">关闭</button>
          </span>
        </div>
        <textarea class="editor-scrollbar h-96 w-full rounded bg-slate-950 p-2 font-mono text-xs" :value="jsonText" @change="importDoc(($event.target as HTMLTextAreaElement).value)" />
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
      <div class="dialog w-[720px]">
        <div class="mb-2 flex justify-between"><span>发布管理</span><button @click="showPublications = false">关闭</button></div>
        <ul class="editor-scrollbar max-h-96 space-y-2 overflow-auto">
          <li v-for="item in publications" :key="item.id" class="rounded border border-slate-700 p-2 text-sm">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="truncate">{{ item.description }}</div>
                <div class="truncate font-mono text-xs text-slate-500">{{ publicationUrl(item.id) }}</div>
                <div class="text-xs" :class="item.status === 'active' ? 'text-emerald-400' : 'text-amber-300'">{{ item.status === 'active' ? '发布中' : '已暂停' }}</div>
                <div v-if="updateNote[item.id]" class="text-xs" :class="updateNote[item.id] === '无改动' ? 'text-slate-400' : 'text-emerald-400'">{{ updateNote[item.id] }}</div>
              </div>
              <div class="flex shrink-0 flex-wrap justify-end gap-1">
                <button class="btn" @click="copyApi(item.id)">{{ copiedId === item.id ? '已复制' : '复制地址' }}</button>
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
    <div v-if="confirmDropPublication" class="overlay z-50" @click.self="confirmDropPublication = null">
      <div class="dialog">
        <p>删除发布「{{ confirmDropPublication.description }}」？对应 API 将不可用。</p>
        <div class="mt-3 flex justify-end gap-2">
          <button class="btn" @click="confirmDropPublication = null">取消</button>
          <button class="btn text-rose-300" @click="removePublication">删除</button>
        </div>
      </div>
    </div>
    <div v-if="showSample" class="overlay" @click.self="showSample = false">
      <div class="dialog w-[640px]">
        <div class="mb-2 flex items-center justify-between gap-2">
          <span>样例数据。可粘贴接口整包，会取 obj[0]。不会写入设备 JSON。</span>
          <button class="btn shrink-0" @click="loadRandomPatient">随机病人</button>
        </div>
        <textarea v-model="sampleText" class="editor-scrollbar h-80 w-full rounded bg-slate-950 p-2 font-mono text-xs" />
        <div class="mt-2 flex justify-end gap-2">
          <button class="btn" @click="showSample = false">取消</button>
          <button class="btn" @click="applySample">应用</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.btn { border-radius: 4px; background: rgb(30 41 59); padding: 4px 8px; font-size: 12px; }
.btn:hover { background: rgb(51 65 85); }
.menu { display: block; width: 100%; padding: 6px 12px; text-align: left; font-size: 13px; }
.menu:hover { background: rgb(255 255 255 / 0.08); }
.menu:disabled { opacity: 0.4; }
.overlay { position: fixed; inset: 0; z-index: 40; display: flex; align-items: center; justify-content: center; background: rgb(0 0 0 / 0.55); }
.dialog { width: 420px; border-radius: 8px; border: 1px solid rgb(51 65 85); background: rgb(15 23 42); padding: 16px; }
</style>
