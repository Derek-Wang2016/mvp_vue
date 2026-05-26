<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Icon } from '@iconify/vue'
import type { IconDictEntry } from '@mvp-vue/schema'

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

// Full icon list fetched from Iconify API
const allIcons = ref<string[]>([])
const loading = ref(true)
const loadError = ref(false)

const PAGE_SIZE = 56 // 7 cols × 8 rows
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

onMounted(() => { fetchIconList() })

// Reset page when search changes
watch(() => props.search, () => { currentPage.value = 0 })

const matchedIcons = computed(() => {
  const q = props.search.trim()
  if (!q) return allIcons.value
  const lower = q.toLowerCase()
  return allIcons.value.filter((i) => i.toLowerCase().includes(lower))
})

const totalPages = computed(() => Math.max(1, Math.ceil(matchedIcons.value.length / PAGE_SIZE)))

function clampPage() {
  if (currentPage.value >= totalPages.value) currentPage.value = Math.max(0, totalPages.value - 1)
}

const pageIcons = computed(() => {
  clampPage()
  const start = currentPage.value * PAGE_SIZE
  return matchedIcons.value.slice(start, start + PAGE_SIZE)
})

function goPage(dir: -1 | 1) {
  currentPage.value = Math.max(0, Math.min(totalPages.value - 1, currentPage.value + dir))
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
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60" @click="emit('cancel')">
    <div class="bg-[#1a2332] border border-white/20 rounded-lg shadow-2xl p-4 w-[480px]" @click.stop>
      <h3 class="text-sm font-medium text-slate-200 mb-3">选择图标</h3>
      <div class="flex gap-1 mb-3">
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
          class="w-full mb-2 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 outline-none"
          placeholder="搜索图标..."
          :value="search"
          @input="emit('update:search', ($event.target as HTMLInputElement).value)"
        />
        <div v-if="loading" class="flex items-center justify-center py-12 text-xs text-slate-500">
          加载图标列表...
        </div>
        <template v-else>
          <div class="grid grid-cols-7 auto-rows-min gap-2 max-h-[340px] overflow-y-auto">
            <button
              v-for="icon in pageIcons"
              :key="icon"
              :class="entry.iconName === icon ? 'bg-indigo-500/25 border-indigo-400/50 ring-1 ring-indigo-400/30' : 'border-white/10 hover:bg-white/[0.08] hover:border-white/20'"
              class="flex flex-col items-center justify-center gap-1 p-2 rounded-lg border text-[9px] text-slate-400 transition-colors min-h-[56px]"
              :title="icon"
              @click="emit('confirm', { ...entry, iconType: 'preset', iconName: icon, iconSvg: undefined })"
            >
              <Icon :icon="icon" :width="22" :height="22" class="text-slate-300" />
              <span class="truncate w-full text-center leading-tight">{{ icon.replace('tabler:', '') }}</span>
            </button>
            <div v-if="pageIcons.length === 0" class="col-span-7 py-8 text-center text-xs text-slate-500">
              无匹配图标
            </div>
          </div>
          <!-- Pagination controls -->
          <div class="flex items-center justify-between mt-2 pt-2 border-t border-white/10">
            <span class="text-[10px] text-slate-500">
              <template v-if="search">搜索 "{{ search }}" — {{ matchedIcons.length }} 个结果 · </template>{{ currentPage + 1 }} / {{ totalPages }} 页
            </span>
            <div class="flex gap-1">
              <button
                class="px-2.5 py-1 text-[10px] rounded border border-white/15 text-slate-400 hover:bg-white/10 disabled:opacity-20 disabled:cursor-default"
                :disabled="currentPage <= 0"
                @click="goPage(-1)"
              >上一页</button>
              <button
                class="px-2.5 py-1 text-[10px] rounded border border-white/15 text-slate-400 hover:bg-white/10 disabled:opacity-20 disabled:cursor-default"
                :disabled="currentPage >= totalPages - 1"
                @click="goPage(1)"
              >下一页</button>
            </div>
          </div>
          <div v-if="loadError" class="mt-1 text-[9px] text-amber-500/70">离线模式 — 仅显示内置图标</div>
        </template>
      </template>

      <template v-if="pickerTab === 'custom'">
        <textarea
          class="w-full h-32 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-xs text-slate-200 font-mono resize-none outline-none"
          placeholder="<svg>...</svg>"
          :value="customSvgInput"
          @input="emit('update:customSvgInput', ($event.target as HTMLTextAreaElement).value)"
        />
        <button
          class="w-full mt-2 py-1.5 bg-indigo-500/30 text-indigo-300 text-xs rounded hover:bg-indigo-500/40"
          @click="emit('confirm', { ...entry, iconType: 'custom', iconName: undefined, iconSvg: customSvgInput })"
        >确定</button>
      </template>
    </div>
  </div>
</template>
