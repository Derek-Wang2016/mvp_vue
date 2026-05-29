<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { CustomIconListItem, IconDictEntry } from '@mvp-vue/schema'
import { listItemToRecord } from '@mvp-vue/schema'
import {
  createCustomIcon,
  deleteCustomIcon,
  listCustomIcons,
} from '../api'
import { useEditorStore } from '../stores/editorStore'
import ConfirmDialog from './ConfirmDialog.vue'

const props = defineProps<{
  entry: IconDictEntry
  search: string
  pickerTab: 'preset' | 'custom'
  customSvgInput: string
}>()

const emit = defineEmits<{
  'update:search': [v: string]
  'update:pickerTab': [v: 'preset' | 'custom']
  'update:customSvgInput': [v: string]
  confirm: [entry: IconDictEntry]
  cancel: []
}>()

const store = useEditorStore()

type CustomSubTab = 'paste' | 'library'
const customSubTab = ref<CustomSubTab>('paste')
const saveName = ref('')
const libraryItems = ref<CustomIconListItem[]>([])
const libraryLoading = ref(false)
const libraryError = ref('')
const librarySearch = ref('')
const saving = ref(false)
const deletingId = ref<number | null>(null)
const deleteConfirmId = ref<number | null>(null)

const deleteConfirmName = computed(() => {
  const id = deleteConfirmId.value
  if (id == null) return ''
  return libraryItems.value.find((i) => i.id === id)?.name ?? `#${id}`
})

// Preset (Iconify)
const allIcons = ref<string[]>([])
const loading = ref(true)
const loadError = ref(false)
const PAGE_SIZE = 56
const currentPage = ref(0)

async function fetchIconList() {
  try {
    const res = await fetch('https://api.iconify.design/collection?prefix=tabler&info=false')
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const list: string[] = data.uncategorized ?? []
    allIcons.value = list.map((name) => `tabler:${name}`)
    loading.value = false
  } catch {
    allIcons.value = PRESET_FALLBACK
    loadError.value = true
    loading.value = false
  }
}

async function fetchLibrary() {
  libraryLoading.value = true
  libraryError.value = ''
  try {
    libraryItems.value = await listCustomIcons(true)
  } catch (e) {
    libraryError.value = e instanceof Error ? e.message : '加载失败'
    libraryItems.value = []
  } finally {
    libraryLoading.value = false
  }
}

function close() {
  emit('cancel')
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') close()
}

onMounted(() => {
  fetchIconList()
  if (props.pickerTab === 'custom') {
    customSubTab.value = props.entry.iconType === 'saved' ? 'library' : 'paste'
    if (props.entry.iconType === 'saved') fetchLibrary()
  }
  window.addEventListener('keydown', onKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
})

watch(() => props.pickerTab, (tab) => {
  if (tab === 'custom' && customSubTab.value === 'library' && libraryItems.value.length === 0) {
    fetchLibrary()
  }
})

watch(customSubTab, (sub) => {
  if (sub === 'library' && libraryItems.value.length === 0 && !libraryLoading.value) fetchLibrary()
})

watch(() => props.search, () => { currentPage.value = 0 })

const matchedIcons = computed(() => {
  const q = props.search.trim()
  if (!q) return allIcons.value
  const lower = q.toLowerCase()
  return allIcons.value.filter((i) => i.toLowerCase().includes(lower))
})

const totalPages = computed(() => Math.max(1, Math.ceil(matchedIcons.value.length / PAGE_SIZE)))

const pageIcons = computed(() => {
  if (currentPage.value >= totalPages.value) currentPage.value = Math.max(0, totalPages.value - 1)
  const start = currentPage.value * PAGE_SIZE
  return matchedIcons.value.slice(start, start + PAGE_SIZE)
})

const filteredLibrary = computed(() => {
  const q = librarySearch.value.trim().toLowerCase()
  if (!q) return libraryItems.value
  return libraryItems.value.filter((i) => i.name.toLowerCase().includes(q))
})

function goPage(dir: -1 | 1) {
  currentPage.value = Math.max(0, Math.min(totalPages.value - 1, currentPage.value + dir))
}

function confirmPreset(icon: string) {
  emit('confirm', {
    ...props.entry,
    iconType: 'preset',
    iconName: icon,
    iconSvg: undefined,
    savedIconId: undefined,
  })
}

function confirmInlineSvg() {
  emit('confirm', {
    ...props.entry,
    iconType: 'custom',
    iconName: undefined,
    iconSvg: props.customSvgInput,
    savedIconId: undefined,
  })
}

function confirmSaved(item: CustomIconListItem) {
  const record = listItemToRecord(item)
  if (record) store.mergeSavedIcon(record)
  emit('confirm', {
    ...props.entry,
    iconType: 'saved',
    iconName: undefined,
    iconSvg: undefined,
    savedIconId: item.id,
  })
}

async function handleSaveToLibrary() {
  const name = saveName.value.trim() || '未命名图标'
  const svg = props.customSvgInput.trim()
  if (!svg) return
  saving.value = true
  try {
    const created = await createCustomIcon(name, svg)
    store.mergeSavedIcon(created)
    libraryItems.value = [created, ...libraryItems.value.filter((i) => i.id !== created.id)]
    saveName.value = ''
    customSubTab.value = 'library'
    confirmSaved(created)
  } catch (e) {
    libraryError.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    saving.value = false
  }
}

function requestDeleteLibrary(id: number) {
  deleteConfirmId.value = id
}

function cancelDeleteLibrary() {
  if (deletingId.value != null) return
  deleteConfirmId.value = null
}

async function executeDeleteLibrary() {
  const id = deleteConfirmId.value
  if (id == null) return
  deletingId.value = id
  try {
    await deleteCustomIcon(id)
    libraryItems.value = libraryItems.value.filter((i) => i.id !== id)
    store.savedIcons = store.savedIcons.filter((i) => i.id !== id)
    deleteConfirmId.value = null
  } catch (e) {
    libraryError.value = e instanceof Error ? e.message : '删除失败'
  } finally {
    deletingId.value = null
  }
}

const PRESET_FALLBACK = [
  'tabler:circle', 'tabler:square', 'tabler:triangle', 'tabler:star',
  'tabler:heart', 'tabler:activity', 'tabler:award', 'tabler:bell',
  'tabler:bolt', 'tabler:bookmark', 'tabler:briefcase', 'tabler:building',
  'tabler:calendar', 'tabler:camera', 'tabler:chart-bar', 'tabler:check',
  'tabler:cloud', 'tabler:code', 'tabler:cpu', 'tabler:database',
  'tabler:device-desktop', 'tabler:download', 'tabler:file', 'tabler:flag',
  'tabler:globe', 'tabler:hash', 'tabler:home', 'tabler:link',
  'tabler:lock', 'tabler:mail', 'tabler:map-pin', 'tabler:message',
  'tabler:music', 'tabler:phone', 'tabler:settings', 'tabler:shield',
  'tabler:shopping-cart', 'tabler:tag', 'tabler:users', 'tabler:wifi',
  'tabler:x', 'tabler:zoom-in',
]
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="icon-picker-title"
      @click.self="close"
    >
      <div class="bg-[#1a2332] border border-white/20 rounded-lg shadow-2xl p-4 w-[500px] max-w-full max-h-[90vh] flex flex-col" @click.stop>
        <div class="flex items-center justify-between gap-2 mb-3 shrink-0">
          <h3 id="icon-picker-title" class="text-sm font-medium text-slate-200">选择图标</h3>
          <button
            type="button"
            class="shrink-0 h-7 w-7 flex items-center justify-center rounded-md text-slate-400 hover:text-slate-100 hover:bg-white/10 transition-colors"
            title="关闭 (Esc)"
            aria-label="关闭"
            @click="close"
          >×</button>
        </div>
      <div class="flex gap-1 mb-3 shrink-0">
        <button
          :class="pickerTab === 'preset' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/[0.08] text-slate-400'"
          class="flex-1 text-[11px] py-1 rounded"
          @click="emit('update:pickerTab', 'preset')"
        >内置图标</button>
        <button
          :class="pickerTab === 'custom' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-white/[0.08] text-slate-400'"
          class="flex-1 text-[11px] py-1 rounded"
          @click="emit('update:pickerTab', 'custom')"
        >自定义 SVG</button>
      </div>

      <template v-if="pickerTab === 'preset'">
        <input
          class="w-full mb-2 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 outline-none shrink-0"
          placeholder="搜索图标..."
          :value="search"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
        />
        <div v-if="loading" class="flex items-center justify-center py-12 text-xs text-slate-500">
          加载图标列表...
        </div>
        <template v-else>
          <div class="editor-scrollbar grid grid-cols-7 auto-rows-min gap-2 max-h-[340px] overflow-y-auto overflow-x-hidden min-h-0">
            <button
              v-for="icon in pageIcons"
              :key="icon"
              :class="entry.iconName === icon ? 'bg-indigo-500/25 border-indigo-400/50 ring-1 ring-indigo-400/30' : 'border-white/10 hover:bg-white/[0.08] hover:border-white/20'"
              class="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-[9px] text-slate-400 transition-colors min-h-[56px]"
              :title="icon"
              @click="confirmPreset(icon)"
            >
              <Icon :icon="icon" :width="22" :height="22" class="text-slate-300" />
              <span class="truncate w-full text-center leading-tight">{{ icon.replace('tabler:', '') }}</span>
            </button>
            <div v-if="pageIcons.length === 0" class="col-span-7 py-8 text-center text-xs text-slate-500">
              无匹配图标
            </div>
          </div>
          <div class="flex items-center justify-between mt-2 pt-2 border-t border-white/10 shrink-0">
            <span class="text-[10px] text-slate-500">
              <template v-if="search">搜索 "{{ search }}" — {{ matchedIcons.length }} 个结果 · </template>{{ currentPage + 1 }} / {{ totalPages }} 页
            </span>
            <div class="flex gap-1">
              <button
                class="px-2.5 py-1 text-[10px] rounded border border-white/15 text-slate-400 hover:bg-white/10 disabled:opacity-20"
                :disabled="currentPage <= 0"
                @click="goPage(-1)"
              >上一页</button>
              <button
                class="px-2.5 py-1 text-[10px] rounded border border-white/15 text-slate-400 hover:bg-white/10 disabled:opacity-20"
                :disabled="currentPage >= totalPages - 1"
                @click="goPage(1)"
              >下一页</button>
            </div>
          </div>
          <div v-if="loadError" class="mt-1 text-[9px] text-amber-500/70 shrink-0">离线模式 — 仅显示内置图标</div>
        </template>
      </template>

      <template v-if="pickerTab === 'custom'">
        <div class="flex gap-1 mb-2 shrink-0">
          <button
            :class="customSubTab === 'paste' ? 'bg-amber-500/15 text-amber-300/90' : 'bg-white/[0.06] text-slate-500'"
            class="flex-1 text-[10px] py-1 rounded border border-white/10"
            @click="customSubTab = 'paste'"
          >粘贴 SVG</button>
          <button
            :class="customSubTab === 'library' ? 'bg-amber-500/15 text-amber-300/90' : 'bg-white/[0.06] text-slate-500'"
            class="flex-1 text-[10px] py-1 rounded border border-white/10"
            @click="customSubTab = 'library'"
          >我的图标库</button>
        </div>

        <template v-if="customSubTab === 'paste'">
          <textarea
            class="editor-scrollbar w-full h-28 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-xs text-slate-200 font-mono resize-none outline-none shrink-0 overflow-y-auto"
            placeholder="<svg>...</svg>"
            :value="customSvgInput"
            @input="emit('update:customSvgInput', ($event.target as HTMLTextAreaElement).value)"
          />
          <input
            v-model="saveName"
            class="w-full mt-2 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 outline-none shrink-0"
            placeholder="保存到库时的名称（可选）"
          />
          <div class="flex gap-2 mt-2 shrink-0">
            <button
              class="flex-1 py-1.5 bg-indigo-500/30 text-indigo-300 text-xs rounded hover:bg-indigo-500/40 disabled:opacity-40"
              :disabled="!customSvgInput.trim()"
              @click="confirmInlineSvg"
            >仅本次使用</button>
            <button
              class="flex-1 py-1.5 bg-amber-500/20 text-amber-300 text-xs rounded hover:bg-amber-500/30 disabled:opacity-40"
              :disabled="!customSvgInput.trim() || saving"
              @click="handleSaveToLibrary"
            >{{ saving ? '保存中…' : '保存到库并选用' }}</button>
          </div>
        </template>

        <template v-else>
          <input
            v-model="librarySearch"
            class="w-full mb-2 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 outline-none shrink-0"
            placeholder="搜索已保存图标..."
          />
          <div v-if="libraryLoading" class="py-10 text-center text-xs text-slate-500">加载图标库...</div>
          <div v-else-if="libraryError && filteredLibrary.length === 0" class="py-6 text-center text-xs text-amber-500/80">{{ libraryError }}</div>
          <div
            v-else
            class="editor-scrollbar grid grid-cols-5 gap-2 max-h-[300px] overflow-y-auto overflow-x-hidden min-h-0"
          >
            <div
              v-for="item in filteredLibrary"
              :key="item.id"
              class="relative group"
            >
              <button
                type="button"
                :class="entry.iconType === 'saved' && entry.savedIconId === item.id
                  ? 'bg-amber-500/20 border-amber-400/40 ring-1 ring-amber-400/30'
                  : 'border-white/10 hover:bg-white/[0.08]'"
                class="w-full flex flex-col items-center gap-1 p-2 rounded-lg border min-h-[64px]"
                :title="item.name"
                @click="confirmSaved(item)"
              >
                <span
                  v-if="item.svgContent"
                  class="inline-flex h-7 w-7 items-center justify-center text-slate-300 [&>svg]:max-h-full [&>svg]:max-w-full"
                  v-html="item.svgContent"
                />
                <span class="text-[9px] text-slate-400 truncate w-full text-center">{{ item.name }}</span>
                <span class="text-[8px] text-amber-500/60">库</span>
              </button>
              <button
                type="button"
                class="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-red-500/80 text-[10px] text-white leading-none"
                :disabled="deletingId === item.id"
                title="从库中删除"
                @click.stop="requestDeleteLibrary(item.id)"
              >×</button>
            </div>
            <div v-if="filteredLibrary.length === 0" class="col-span-5 py-8 text-center text-xs text-slate-500">
              图标库为空，可在「粘贴 SVG」中保存
            </div>
          </div>
          <p v-if="libraryError && filteredLibrary.length > 0" class="mt-1 text-[9px] text-amber-500/70 shrink-0">{{ libraryError }}</p>
        </template>
      </template>

        <div class="mt-3 pt-3 border-t border-white/10 flex justify-end shrink-0">
          <button
            type="button"
            class="px-4 py-1.5 text-xs rounded border border-white/15 text-slate-300 hover:bg-white/10 hover:text-slate-100 transition-colors"
            @click="close"
          >取消</button>
        </div>
      </div>
    </div>
    <ConfirmDialog
      :open="deleteConfirmId != null"
      overlay-class="z-[80]"
      title="删除图标"
      :message="`确定从图标库删除「${deleteConfirmName}」？已保存到页面 JSON 中的快照不受影响。`"
      confirm-label="删除"
      tone="danger"
      :loading="deletingId != null"
      @confirm="executeDeleteLibrary"
      @cancel="cancelDeleteLibrary"
    />
  </Teleport>
</template>
