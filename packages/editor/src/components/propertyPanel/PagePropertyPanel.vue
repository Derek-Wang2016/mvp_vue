<script setup lang="ts">
import { ref } from 'vue'
import { useEditorStore } from '../../stores/editorStore'
import { storeToRefs } from 'pinia'
import type { DataSourceType, BgGradient, DataSource, IconDictEntry } from '@mvp-vue/schema'
import PageSizeFields from '../PageSizeFields.vue'
import ColorSwatch from '../ColorSwatch.vue'
import EditorNumberInput from '../EditorNumberInput.vue'
import IconPickerModal from '../IconPickerModal.vue'
import JsonExportDialog from '../JsonExportDialog.vue'
import DictJsonImportDialog from '../DictJsonImportDialog.vue'
import ColorField from '../ColorField.vue'
import { Icon } from '@iconify/vue'
import { PROP_LABEL, PROP_HINT, PROP_SECTION, PROP_SELECT_COMPACT } from './shared'

const store = useEditorStore()
const {
  pageWidth, pageHeight, bgColor, bgGradient, bgImage, bgOpacity,
  dataSources, colorDict, iconDict, abbrevDict,
} = storeToRefs(store)

type TabId = 'page' | 'dataSources' | 'colorDict' | 'iconDict' | 'abbrevDict'
const tab = ref<TabId>('page')

// Data source form state
const showAddDs = ref(false)
const editingDsId = ref<string | null>(null)
const newDsType = ref<DataSourceType>('static')
const newDsId = ref('')
const newDsUrl = ref('')
const newDsDataPath = ref('')
const newDsRefresh = ref(0)
const newDsQuery = ref('')
const newDsStaticData = ref('')

// Icon picker state
const iconPickerEntryId = ref<string | null>(null)
const iconSearch = ref('')
const iconPickerTab = ref<'preset' | 'custom'>('preset')
const customSvgInput = ref('')

// Export/import dialog state (placeholder until Batch 12)
const pageConfigExportOpen = ref(false)
const pageConfigImportOpen = ref(false)

const pageConfigExportData = { dataSources: dataSources.value, colorDict: colorDict.value, iconDict: iconDict.value, abbrevDict: abbrevDict.value }

// --- Data Source Form ---
function handleSubmit() {
  if (!newDsId.value.trim()) return
  if (editingDsId.value) {
    const partial: Partial<DataSource> = {}
    if (newDsType.value === 'rest') {
      partial.url = newDsUrl.value
      partial.dataPath = newDsDataPath.value || undefined
      partial.refreshInterval = newDsRefresh.value || undefined
    } else if (newDsType.value === 'sql') {
      partial.query = newDsQuery.value
      partial.refreshInterval = newDsRefresh.value || undefined
    } else {
      try { partial.staticData = JSON.parse(newDsStaticData.value) } catch { partial.staticData = [] }
    }
    store.updateDataSource(editingDsId.value, partial)
  } else {
    const ds: DataSource = { id: newDsId.value.trim(), type: newDsType.value }
    if (newDsType.value === 'rest') {
      ds.url = newDsUrl.value
      ds.dataPath = newDsDataPath.value || undefined
      ds.refreshInterval = newDsRefresh.value || undefined
    } else if (newDsType.value === 'sql') {
      ds.query = newDsQuery.value
      ds.refreshInterval = newDsRefresh.value || undefined
    } else {
      try { ds.staticData = JSON.parse(newDsStaticData.value) } catch { ds.staticData = [] }
    }
    store.addDataSource(ds)
  }
  resetForm()
}

function startEdit(dsId: string) {
  const ds = dataSources.value.find((d) => d.id === dsId)
  if (!ds) return
  editingDsId.value = dsId
  newDsType.value = ds.type
  newDsId.value = ds.id
  newDsUrl.value = ds.url ?? ''
  newDsDataPath.value = ds.dataPath ?? ''
  newDsRefresh.value = ds.refreshInterval ?? 0
  newDsQuery.value = ds.query ?? ''
  newDsStaticData.value = ds.staticData ? JSON.stringify(ds.staticData, null, 2) : ''
  showAddDs.value = true
}

function resetForm() {
  showAddDs.value = false
  editingDsId.value = null
  newDsId.value = ''
  newDsUrl.value = ''
  newDsDataPath.value = ''
  newDsRefresh.value = 0
  newDsQuery.value = ''
  newDsStaticData.value = ''
}

// --- Icon Picker (placeholder) ---
function openIconPicker(entryId: string) {
  const entry = iconDict.value.find((e) => e.id === entryId)
  iconPickerEntryId.value = entryId
  iconSearch.value = ''
  iconPickerTab.value = entry?.iconType === 'custom' ? 'custom' : 'preset'
  customSvgInput.value = entry?.iconSvg ?? ''
}

function closeIconPicker() {
  iconPickerEntryId.value = null
}

// --- Tab button class ---
function tabClass(id: TabId) {
  return tab.value === id
    ? 'bg-indigo-500/20 text-indigo-300'
    : 'bg-white/[0.08] text-slate-400'
}
</script>

<template>
  <aside class="relative z-10 flex h-full min-h-0 w-[320px] shrink-0 flex-col border-l border-white/10 bg-[#0f1824] p-3">
    <h2 :class="[PROP_SECTION, 'mb-3 flex shrink-0 items-center gap-1.5']">
      <span class="text-indigo-400 text-[8px]">◆</span>
      页面属性
    </h2>

    <!-- Tab buttons -->
    <div class="mb-3 flex shrink-0 gap-1">
      <button type="button" :class="['flex-1 rounded py-1 text-[11px]', tabClass('page')]" @click="tab = 'page'">页面</button>
      <button type="button" :class="['flex-1 rounded py-1 text-[11px]', tabClass('dataSources')]" @click="tab = 'dataSources'">数据源</button>
      <button type="button" :class="['flex-1 rounded py-1 text-[11px]', tabClass('colorDict')]" @click="tab = 'colorDict'">颜色字典</button>
      <button type="button" :class="['flex-1 rounded py-1 text-[11px]', tabClass('iconDict')]" @click="tab = 'iconDict'">图标字典</button>
      <button type="button" :class="['flex-1 rounded py-1 text-[11px]', tabClass('abbrevDict')]" @click="tab = 'abbrevDict'">缩略语</button>
    </div>

    <!-- Export/Import buttons -->
    <div class="mb-3 flex shrink-0 gap-2">
      <button type="button"
        class="flex-1 text-[11px] py-1.5 rounded border border-white/10 bg-white/[0.06] text-slate-300 hover:bg-white/10 hover:text-slate-100 transition-colors"
        @click="pageConfigExportOpen = true"
      >导出页面配置</button>
      <button type="button"
        class="flex-1 text-[11px] py-1.5 rounded border border-indigo-400/25 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20 hover:text-indigo-200 transition-colors"
        @click="pageConfigImportOpen = true"
      >导入页面配置</button>
    </div>

    <!-- Scrollable content -->
    <div class="editor-scrollbar min-h-0 flex-1 overflow-y-auto overflow-x-hidden">

      <!-- === PAGE TAB === -->
      <div v-if="tab === 'page'" class="space-y-3 pb-2">
        <PageSizeFields
          :width="pageWidth"
          :height="pageHeight"
          @change="store.setPageSize"
        />

        <ColorField label="背景颜色" :value="bgColor" @change="store.setBgColor($event)" />

        <label class="block">
          <span :class="PROP_LABEL">渐变模式</span>
          <select
            class="editor-select w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 outline-none transition-colors"
            :value="bgGradient"
            @change="store.setBgGradient(($event.target as HTMLSelectElement).value as BgGradient)"
          >
            <option value="none">无渐变</option>
            <option value="linear-top">线性 — 上→下</option>
            <option value="linear-left">线性 — 左→右</option>
            <option value="linear-diagonal">线性 — 对角</option>
            <option value="radial">径向</option>
          </select>
        </label>

        <div class="border-t border-white/10 pt-3" />

        <label class="block">
          <span :class="PROP_LABEL">底图 URL</span>
          <input
            class="w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30 outline-none transition-colors"
            placeholder="https://..."
            :value="bgImage"
            @change="store.setBgImage(($event.target as HTMLInputElement).value)"
          />
        </label>
        <label class="block">
          <span :class="PROP_LABEL">底图透明度</span>
          <div class="flex items-center gap-2 mt-1">
            <input type="range" min="0" max="1" step="0.05" class="flex-1 accent-indigo-500"
              :value="bgOpacity"
              @input="store.setBgOpacity(Number(($event.target as HTMLInputElement).value))"
            />
            <span class="text-xs text-slate-400 font-mono w-8 text-right">
              {{ Math.round(bgOpacity * 100) }}%
            </span>
          </div>
        </label>
      </div>

      <!-- === DATA SOURCES TAB === -->
      <div v-if="tab === 'dataSources'" class="space-y-3 pb-2">
        <div class="flex items-center justify-between mb-2">
          <span :class="PROP_LABEL">数据源列表</span>
          <button class="text-[11px] text-indigo-400 hover:text-indigo-300"
            @click="showAddDs ? resetForm() : (showAddDs = true)"
          >{{ showAddDs ? '取消' : '+ 添加' }}</button>
        </div>

        <!-- Add/Edit form -->
        <div v-if="showAddDs" class="space-y-2 mb-3 p-2 bg-white/5 rounded-md border border-white/10">
          <label class="block">
            <span class="text-[9px] text-slate-500">类型</span>
            <select :class="PROP_SELECT_COMPACT" :value="newDsType"
              @change="newDsType = ($event.target as HTMLSelectElement).value as DataSourceType"
            >
              <option value="static">静态 JSON</option>
              <option value="rest">REST API</option>
              <option value="sql">SQL</option>
            </select>
          </label>
          <label class="block">
            <span class="text-[9px] text-slate-500">ID</span>
            <input class="w-full mt-0.5 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-slate-200"
              placeholder="ds-1" v-model="newDsId" />
          </label>
          <template v-if="newDsType === 'rest'">
            <label class="block">
              <span class="text-[9px] text-slate-500">URL</span>
              <input class="w-full mt-0.5 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-slate-200"
                placeholder="https://api.example.com/data" v-model="newDsUrl" />
            </label>
            <label class="block">
              <span class="text-[9px] text-slate-500">数据路径 (JSONPath)</span>
              <input class="w-full mt-0.5 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-slate-200"
                placeholder="$.data.items" v-model="newDsDataPath" />
            </label>
          </template>
          <label v-if="newDsType === 'sql'" class="block">
            <span class="text-[9px] text-slate-500">SQL</span>
            <textarea class="w-full mt-0.5 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-slate-200 font-mono"
              rows="3" placeholder="SELECT * FROM sales" v-model="newDsQuery" />
          </label>
          <label v-if="newDsType === 'static'" class="block">
            <span class="text-[9px] text-slate-500">JSON 数据</span>
            <textarea class="w-full mt-0.5 bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-slate-200 font-mono"
              rows="4" placeholder='[{"name":"A","value":100}]' v-model="newDsStaticData" />
          </label>
          <label v-if="newDsType === 'rest' || newDsType === 'sql'" class="block">
            <span class="text-[9px] text-slate-500">刷新间隔（秒，0=不刷新）</span>
            <EditorNumberInput :min="0" class="w-full mt-0.5"
              input-class="w-full bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-slate-200"
              :model-value="newDsRefresh"
              @update:model-value="newDsRefresh = Number($event)"
            />
          </label>
          <button class="w-full py-1 bg-indigo-500/30 text-indigo-300 text-xs rounded hover:bg-indigo-500/40"
            @click="handleSubmit"
          >{{ editingDsId ? '保存修改' : '添加数据源' }}</button>
        </div>

        <p v-if="dataSources.length === 0 && !showAddDs" :class="PROP_HINT">暂无数据源</p>
        <div v-for="ds in dataSources" :key="ds.id"
          class="flex items-center justify-between py-1 border-b border-white/5 text-xs"
        >
          <div>
            <span class="text-slate-300">{{ ds.id }}</span>
            <span class="text-slate-600 ml-1">({{ ds.type }})</span>
          </div>
          <div class="flex items-center gap-2">
            <button class="text-indigo-400/60 hover:text-indigo-400 text-[10px]" @click="startEdit(ds.id)">编辑</button>
            <button class="text-red-400/60 hover:text-red-400 text-[10px]" @click="store.removeDataSource(ds.id)">删除</button>
          </div>
        </div>
      </div>

      <!-- === COLOR DICT TAB === -->
      <div v-if="tab === 'colorDict'" class="space-y-3 pb-2">
        <div class="flex items-center justify-between mb-2">
          <span :class="PROP_LABEL">颜色字典</span>
          <button class="text-[11px] text-indigo-400 hover:text-indigo-300"
            @click="store.addColorDictEntry({ key: '', matchColor: '#ff0000' })"
          >+ 添加</button>
        </div>
        <p v-if="colorDict.length === 0" :class="PROP_HINT">暂无颜色字典条目</p>
        <div v-if="colorDict.length > 0" class="flex flex-col gap-1.5">
          <div v-for="entry in colorDict" :key="entry.id" class="flex h-7 items-center gap-1.5">
            <input
              class="h-7 flex-1 min-w-0 box-border rounded border border-white/15 bg-white/[0.08] px-2 py-0 text-xs text-slate-100"
              placeholder="KEY"
              :value="entry.key"
              @change="store.updateColorDictEntry(entry.id, { ...entry, key: ($event.target as HTMLInputElement).value })"
            />
            <ColorSwatch
              :value="entry.matchColor"
              @change="(hex: string) => store.updateColorDictEntry(entry.id, { ...entry, matchColor: hex })"
            />
            <input
              class="h-7 w-14 min-w-0 box-border rounded border border-white/10 bg-white/5 px-1.5 py-0 font-mono text-[9px] text-slate-400"
              :value="entry.matchColor"
              @change="store.updateColorDictEntry(entry.id, { ...entry, matchColor: ($event.target as HTMLInputElement).value })"
            />
            <button type="button"
              class="flex h-7 w-7 shrink-0 items-center justify-center p-0 text-base leading-none text-red-400/60 hover:text-red-400"
              @click="store.removeColorDictEntry(entry.id)"
            >×</button>
          </div>
        </div>
      </div>

      <!-- === ICON DICT TAB === -->
      <div v-if="tab === 'iconDict'" class="space-y-3 pb-2">
        <div class="flex items-center justify-between mb-2">
          <span :class="PROP_LABEL">图标字典</span>
          <button class="text-[11px] text-indigo-400 hover:text-indigo-300"
            @click="store.addIconDictEntry({ key: '', iconType: 'preset', iconName: 'tabler:circle' })"
          >+ 添加</button>
        </div>
        <p v-if="iconDict.length === 0" :class="PROP_HINT">暂无图标字典条目</p>
        <div v-if="iconDict.length > 0" class="flex flex-col gap-1.5">
          <div v-for="entry in iconDict" :key="entry.id" class="flex h-7 items-center gap-1.5">
            <input
              class="h-7 flex-1 min-w-0 box-border rounded border border-white/15 bg-white/[0.08] px-2 py-0 text-xs text-slate-100"
              placeholder="KEY"
              :value="entry.key"
              @change="store.updateIconDictEntry(entry.id, { ...entry, key: ($event.target as HTMLInputElement).value })"
            />
            <button type="button"
              class="h-7 w-20 min-w-0 box-border rounded border border-white/10 bg-white/5 px-1.5 py-0 text-[9px] text-slate-400 hover:text-slate-200 hover:border-white/20 truncate text-left"
              @click="openIconPicker(entry.id)"
            >
              {{ entry.iconType === 'preset' ? (entry.iconName ?? '选择...') : '自定义 SVG' }}
            </button>
            <div
              class="h-7 w-7 flex shrink-0 items-center justify-center overflow-hidden rounded border border-white/10 bg-white/5 text-slate-300 [&_svg]:max-h-[18px] [&_svg]:max-w-[18px]"
            >
              <template v-if="entry.iconType === 'preset' && entry.iconName">
                <Icon :icon="entry.iconName" :width="18" :height="18" />
              </template>
              <template v-else-if="entry.iconType === 'custom' && entry.iconSvg">
                <span class="inline-flex items-center justify-center" v-html="entry.iconSvg" />
              </template>
              <span v-else class="text-[9px] text-slate-500">—</span>
            </div>
            <button type="button"
              class="flex h-7 w-7 shrink-0 items-center justify-center p-0 text-base leading-none text-red-400/60 hover:text-red-400"
              @click="store.removeIconDictEntry(entry.id)"
            >×</button>
          </div>
        </div>
      </div>

      <!-- === ABBREV DICT TAB === -->
      <div v-if="tab === 'abbrevDict'" class="space-y-3 pb-2">
        <div class="flex items-center justify-between mb-2">
          <span :class="PROP_LABEL">缩略语字典</span>
          <button class="text-[11px] text-indigo-400 hover:text-indigo-300"
            @click="store.addAbbrevDictEntry({ key: '', abbrev: '' })"
          >+ 添加</button>
        </div>
        <p :class="PROP_HINT">KEY 为完整字段值文本，缩略语为命中后展示的文字（精确匹配）。</p>
        <p v-if="abbrevDict.length === 0" :class="PROP_HINT">暂无缩略语字典条目</p>
        <div v-if="abbrevDict.length > 0" class="flex flex-col gap-1.5">
          <div v-for="entry in abbrevDict" :key="entry.id" class="flex h-7 items-center gap-1.5">
            <input
              class="h-7 flex-1 min-w-0 box-border rounded border border-white/15 bg-white/[0.08] px-2 py-0 text-xs text-slate-100"
              placeholder="完整值 KEY"
              :value="entry.key"
              @change="store.updateAbbrevDictEntry(entry.id, { ...entry, key: ($event.target as HTMLInputElement).value })"
            />
            <input
              class="h-7 w-20 min-w-0 box-border rounded border border-white/15 bg-white/[0.08] px-2 py-0 text-xs text-slate-100"
              placeholder="缩略语"
              :value="entry.abbrev"
              @change="store.updateAbbrevDictEntry(entry.id, { ...entry, abbrev: ($event.target as HTMLInputElement).value })"
            />
            <button type="button"
              class="flex h-7 w-7 shrink-0 items-center justify-center p-0 text-base leading-none text-red-400/60 hover:text-red-400"
              @click="store.removeAbbrevDictEntry(entry.id)"
            >×</button>
          </div>
        </div>
      </div>
    </div>

    <IconPickerModal
      v-if="iconPickerEntryId"
      :entry="iconDict.find((e) => e.id === iconPickerEntryId)!"
      :search="iconSearch"
      :picker-tab="iconPickerTab"
      :custom-svg-input="customSvgInput"
      @update:search="iconSearch = $event"
      @update:picker-tab="iconPickerTab = $event"
      @update:custom-svg-input="customSvgInput = $event"
      @confirm="(updated: IconDictEntry) => { store.updateIconDictEntry(iconPickerEntryId!, updated); closeIconPicker() }"
      @cancel="closeIconPicker"
    />
    <JsonExportDialog
      :open="pageConfigExportOpen"
      title="导出页面配置"
      :data="pageConfigExportData"
      hint="包含 dataSources、colorDict、iconDict 与 abbrevDict，已自动全选，可直接 Ctrl+C 复制到其他页面。"
      @close="pageConfigExportOpen = false"
    />
    <DictJsonImportDialog
      :open="pageConfigImportOpen"
      title="导入页面配置"
      @close="pageConfigImportOpen = false"
      @import="store.importPageConfig($event as any); pageConfigImportOpen = false"
    />
  </aside>
</template>
