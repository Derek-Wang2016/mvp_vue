<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useHmiStore } from './stores/hmiStore'
import { createScreen, deleteScreen, getScreen, listScreens, updateScreen, type HmiListItem } from './api'
import { deviceJson } from './resolve'
import { NODE_TYPES, type HmiDocument } from './types'
import TreePanel from './components/TreePanel.vue'
import PreviewNode from './components/PreviewNode.vue'
import PropertyPanel from './components/PropertyPanel.vue'

const store = useHmiStore()
const { doc, name, selectedPath, screenId } = storeToRefs(store)
const selected = computed(() => store.selected)

const msg = ref('')
const saving = ref(false)
const open = ref(false)
const screens = ref<HmiListItem[]>([])
const showJson = ref(false)
const showDict = ref(false)
const showSample = ref(false)
const sampleText = ref('')
const confirmDelete = ref<HmiListItem | null>(null)
const dictKey = ref('')
const clock = ref(Date.now())

onMounted(() => {
  window.setInterval(() => { clock.value = Date.now() }, 1000)
  const id = new URLSearchParams(window.location.search).get('id')
  if (id) {
    getScreen(Number(id)).then((row) => store.load(row.id, row.name, row.schemaJson)).catch(() => { msg.value = '加载失败' })
  }
})

const scale = computed(() => {
  const maxW = 920
  const maxH = 620
  return Math.min(1, maxW / doc.value.screen.w, maxH / doc.value.screen.h)
})

const jsonText = computed(() => JSON.stringify(deviceJson(doc.value), null, 2))

async function save() {
  saving.value = true
  msg.value = ''
  try {
    if (screenId.value) {
      await updateScreen(screenId.value, name.value, doc.value)
    } else {
      const created = await createScreen(name.value, doc.value)
      store.screenId = created.id
    }
    msg.value = '已保存'
  } catch {
    msg.value = '保存失败，请确认后端已启动'
  } finally {
    saving.value = false
  }
}

async function openList() {
  open.value = true
  try {
    screens.value = await listScreens()
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
}

function editSample() {
  sampleText.value = JSON.stringify(doc.value.sample, null, 2)
  showSample.value = true
}

function applySample() {
  try {
    const parsed = JSON.parse(sampleText.value) as Record<string, unknown>
    const obj = Array.isArray((parsed as { obj?: unknown }).obj)
      ? ((parsed as { obj: Record<string, unknown>[] }).obj[0] ?? {})
      : parsed
    doc.value.sample = obj
    showSample.value = false
  } catch {
    msg.value = '样例 JSON 无法解析'
  }
}

function addDict(kind: 'colors' | 'abbrs' | 'fonts') {
  const key = dictKey.value.trim()
  if (!key) {
    msg.value = '先填写字典名称'
    return
  }
  if (kind === 'fonts') doc.value.fonts[key] = 16
  else doc.value[kind][key] = kind === 'colors' ? '#FFFFFF' : key
  dictKey.value = ''
}

function importDoc(text: string) {
  let parsed: HmiDocument
  try {
    parsed = JSON.parse(text) as HmiDocument
  } catch {
    msg.value = 'JSON 无法解析'
    return
  }
  store.load(screenId.value ?? 0, name.value, {
    version: 1,
    screen: parsed.screen ?? doc.value.screen,
    fonts: parsed.fonts ?? doc.value.fonts,
    colors: parsed.colors ?? {},
    abbrs: parsed.abbrs ?? {},
    sample: parsed.sample ?? doc.value.sample,
    cards: parsed.cards,
  })
  if (!screenId.value) store.screenId = null
}
</script>

<template>
  <div class="flex h-screen flex-col">
    <header class="flex items-center gap-2 border-b border-slate-700 px-3 py-2">
      <span class="text-sm text-slate-400">LVGL HMI</span>
      <input v-model="name" class="w-48 rounded border border-slate-600 bg-slate-950 px-2 py-1 text-sm" />
      <label class="text-xs text-slate-400">宽
        <input class="ml-1 w-16 rounded border border-slate-600 bg-slate-950 px-1" type="number" :value="doc.screen.w" @change="store.setScreenSize(Number(($event.target as HTMLInputElement).value), doc.screen.h)" />
      </label>
      <label class="text-xs text-slate-400">高
        <input class="ml-1 w-16 rounded border border-slate-600 bg-slate-950 px-1" type="number" :value="doc.screen.h" @change="store.setScreenSize(doc.screen.w, Number(($event.target as HTMLInputElement).value))" />
      </label>
      <button class="btn" @click="store.reset()">新建</button>
      <button class="btn" @click="openList">打开</button>
      <button class="btn" :disabled="saving" @click="save">保存</button>
      <button class="btn" @click="showJson = true">设备 JSON</button>
      <button class="btn" @click="showDict = true">字典</button>
      <button class="btn" @click="editSample">样例数据</button>
      <span class="text-xs text-emerald-400">{{ msg }}</span>
    </header>
    <div class="flex min-h-0 flex-1">
      <aside class="flex w-64 flex-col border-r border-slate-700">
        <div class="flex flex-wrap gap-1 border-b border-slate-700 p-2">
          <button v-for="item in NODE_TYPES" :key="item.type" class="btn" @click="store.add(item.type)">{{ item.label }}</button>
          <button class="btn text-rose-300" @click="store.removeSelected()">删除</button>
        </div>
        <div class="editor-scrollbar min-h-0 flex-1 overflow-auto p-2">
          <TreePanel :nodes="doc.cards" :selected="selectedPath" @select="store.select" />
        </div>
      </aside>
      <main class="editor-scrollbar min-w-0 flex-1 overflow-auto bg-slate-950 p-6" @click="store.select([])">
        <div class="origin-top-left" :style="{ width: doc.screen.w + 'px', height: doc.screen.h + 'px', transform: `scale(${scale})` }">
          <PreviewNode
            v-for="(node, index) in doc.cards"
            :key="clock + '-' + index"
            :node="node"
            :doc="doc"
            :path="[index]"
            :selected="selectedPath"
            @select="store.select"
          />
        </div>
      </main>
      <aside class="editor-scrollbar w-72 overflow-auto border-l border-slate-700">
        <PropertyPanel :node="selected" @patch="store.patchNode" />
      </aside>
    </div>

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
        <div class="mb-2 flex justify-between"><span>下发设备的 JSON（不含样例数据）</span><button @click="showJson = false">关闭</button></div>
        <textarea class="editor-scrollbar h-96 w-full rounded bg-slate-950 p-2 font-mono text-xs" :value="jsonText" @change="importDoc(($event.target as HTMLTextAreaElement).value)" />
        <p class="mt-1 text-xs text-slate-500">改完后点文本框外部即写回当前文档。</p>
      </div>
    </div>

    <div v-if="showDict" class="overlay" @click.self="showDict = false">
      <div class="dialog w-[760px]">
        <div class="mb-2 flex justify-between"><span>颜色 / 缩略语 / 字体</span><button @click="showDict = false">关闭</button></div>
        <input v-model="dictKey" class="mb-3 w-full rounded bg-slate-950 px-2 py-1 text-sm" placeholder="新字典名称，再点对应的添加" />
        <div class="grid grid-cols-3 gap-3 text-sm">
          <section>
            <div class="mb-1 flex justify-between">颜色 <button @click="addDict('colors')">添加</button></div>
            <div v-for="(_, key) in doc.colors" :key="key" class="mb-1 flex gap-1">
              <input class="w-24 bg-slate-950" :value="key" readonly />
              <input v-model="doc.colors[key]" class="flex-1 bg-slate-950" />
            </div>
          </section>
          <section>
            <div class="mb-1 flex justify-between">缩略语 <button @click="addDict('abbrs')">添加</button></div>
            <div v-for="(_, key) in doc.abbrs" :key="key" class="mb-1 flex gap-1">
              <span class="w-24 truncate">{{ key }}</span>
              <input v-model="doc.abbrs[key]" class="flex-1 bg-slate-950" />
            </div>
          </section>
          <section>
            <div class="mb-1 flex justify-between">字体 px <button @click="addDict('fonts')">添加</button></div>
            <div v-for="(_, key) in doc.fonts" :key="key" class="mb-1 flex gap-1">
              <span class="w-24 truncate">{{ key }}</span>
              <input v-model.number="doc.fonts[key]" type="number" class="w-20 bg-slate-950" />
            </div>
          </section>
        </div>
        <p class="mt-2 text-xs text-slate-500">节点颜色可写 #RRGGBB，或写字典名 / $字典名。</p>
      </div>
    </div>

    <div v-if="showSample" class="overlay" @click.self="showSample = false">
      <div class="dialog w-[640px]">
        <div class="mb-2">样例数据。可粘贴接口返回的整包，会取 obj[0]。</div>
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
.btn {
  border-radius: 4px;
  background: rgb(30 41 59);
  padding: 4px 8px;
  font-size: 12px;
}
.btn:hover { background: rgb(51 65 85); }
.overlay {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 0.55);
}
.dialog {
  width: 420px;
  border-radius: 8px;
  border: 1px solid rgb(51 65 85);
  background: rgb(15 23 42);
  padding: 16px;
}
</style>
