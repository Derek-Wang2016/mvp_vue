<script setup lang="ts">
import { computed, ref } from 'vue'
import { ICON_OPTIONS } from '../icons/catalog'
import TablerImport from './TablerImport.vue'
import { iconId } from '../resolve'
import { resolveIcon } from '../icons/lvglSvg'
import type { HmiCard, HmiItem, HmiShape, Selection } from '../types'
import { getApiBase } from '../config'
import ColorField from './ColorField.vue'

const props = defineProps<{
  selection: Selection | null
  shape?: HmiShape
  card?: HmiCard
  item?: HmiItem
  colors?: Record<string, string>
  icons?: Record<string, string>
  library?: Record<string, string>
}>()
const emit = defineEmits<{
  patchShape: [patch: Partial<HmiShape>]
  patchCard: [patch: Partial<HmiCard>]
  patchItem: [patch: Partial<HmiItem>]
  patchColors: [colors: Record<string, string>]
  patchIcons: [icons: Record<string, string>]
  patchLibrary: [library: Record<string, string>]
}>()

const uploadMsg = ref('')
const iconName = ref('')
const iconImport = ref('')
const iconImportMsg = ref('')
const tablerOpen = ref(false)
const iconChoices = computed(() => [
  ...ICON_OPTIONS,
  ...Object.keys(props.library ?? {}).map((id) => ({ id, name: id.replace(/^tabler:/, '') })),
])
const colorName = ref('')
const colorImport = ref('')
const colorImportMsg = ref('')
const dictTab = ref<'color' | 'icon'>('color')

async function uploadImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  uploadMsg.value = ''
  const body = new FormData()
  body.append('file', file)
  try {
    const res = await fetch(`${getApiBase()}/api/hmi/files`, { method: 'POST', body })
    const json = await res.json() as { url?: string; error?: string }
    if (!res.ok || !json.url) throw new Error(json.error || '上传失败')
    emit('patchShape', { url: json.url })
    uploadMsg.value = '已写入 url'
  } catch (err) {
    uploadMsg.value = err instanceof Error ? err.message : '上传失败'
  }
}

function num(value: string) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}
function list(value: string): number[] {
  return value.split(',').map((part) => Number(part.trim())).filter((n) => Number.isFinite(n))
}
function addLibraryIcon(icon: { id: string; svg: string }) {
  emit('patchLibrary', { ...props.library, [icon.id]: icon.svg })
}
function removeLibraryIcon(id: string) {
  const library = { ...props.library }
  delete library[id]
  emit('patchLibrary', library)
}
function writeIcons(icons: Record<string, string>) {
  emit('patchIcons', icons)
}
function addIcon() {
  const name = iconName.value.trim()
  if (!name) return
  writeIcons({ ...props.icons, [name]: iconId(props.icons?.[name]) || 'care-1' })
  iconName.value = ''
}
function patchIcon(name: string, icon: string) {
  writeIcons({ ...props.icons, [name]: icon })
}
function removeIcon(name: string) {
  const icons = { ...props.icons }
  delete icons[name]
  writeIcons(icons)
}
function iconEntry(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (value && typeof value === 'object' && 'svg' in value && typeof (value as { svg: unknown }).svg === 'string') {
    return (value as { svg: string }).svg.trim()
  }
  return iconId(value)
}
function importIcons() {
  iconImportMsg.value = ''
  let parsed: unknown
  try {
    parsed = JSON.parse(iconImport.value)
  } catch {
    iconImportMsg.value = '不是合法 JSON'
    return
  }
  const source = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'icons' in parsed
    ? (parsed as { icons: unknown }).icons
    : parsed
  if (!source || typeof source !== 'object' || Array.isArray(source)) {
    iconImportMsg.value = '需要 {"名称":"care-1"} 这样的对象'
    return
  }
  const next = { ...props.icons }
  let count = 0
  for (const [name, value] of Object.entries(source)) {
    const key = name.trim()
    const icon = iconEntry(value)
    if (!key || !resolveIcon(icon, props.library)) continue
    next[key] = icon.startsWith('<svg') ? icon : iconId(value) || icon
    count += 1
  }
  if (!count) {
    iconImportMsg.value = '没有可导入的图标'
    return
  }
  writeIcons(next)
  iconImport.value = ''
  iconImportMsg.value = `已导入 ${count} 条`
}

function writeColors(colors: Record<string, string>) {
  emit('patchColors', colors)
}
function addColor() {
  const name = colorName.value.trim()
  if (!name) return
  writeColors({ ...props.colors, [name]: props.colors?.[name] || '#7C7C7C' })
  colorName.value = ''
}
function patchColor(name: string, color: string) {
  writeColors({ ...props.colors, [name]: color })
}
function removeColor(name: string) {
  const colors = { ...props.colors }
  delete colors[name]
  writeColors(colors)
}
function importColors() {
  colorImportMsg.value = ''
  let parsed: unknown
  try {
    parsed = JSON.parse(colorImport.value)
  } catch {
    colorImportMsg.value = '不是合法 JSON'
    return
  }
  const table = colorTable(parsed)
  if (!table) {
    colorImportMsg.value = '需要 {"名称":"#RRGGBB"} 这样的对象'
    return
  }
  const next = { ...props.colors }
  let count = 0
  for (const [name, color] of Object.entries(table)) {
    const key = name.trim()
    if (!key || !color) continue
    next[key] = color
    count += 1
  }
  if (!count) {
    colorImportMsg.value = '没有可导入的颜色'
    return
  }
  writeColors(next)
  colorImport.value = ''
  colorImportMsg.value = `已导入 ${count} 条`
}
function colorTable(parsed: unknown): Record<string, string> | null {
  const source = parsed && typeof parsed === 'object' && !Array.isArray(parsed) && 'colors' in parsed
    ? (parsed as { colors: unknown }).colors
    : parsed
  if (Array.isArray(source)) {
    const out: Record<string, string> = {}
    for (const entry of source) {
      if (!entry || typeof entry !== 'object') return null
      const row = entry as { key?: unknown; matchColor?: unknown }
      if (typeof row.key !== 'string' || typeof row.matchColor !== 'string') return null
      out[row.key] = row.matchColor.trim()
    }
    return out
  }
  if (!source || typeof source !== 'object' || Array.isArray(source)) return null
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(source)) {
    if (typeof value !== 'string') return null
    out[key] = value.trim()
  }
  return out
}
</script>

<template>
  <div v-if="!selection" class="p-3 text-sm">
    <div class="mb-3 grid grid-cols-2 gap-1 rounded border border-slate-700 p-1">
      <button type="button" class="rounded py-1 text-xs" :class="dictTab === 'color' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'" @click="dictTab = 'color'">颜色</button>
      <button type="button" class="rounded py-1 text-xs" :class="dictTab === 'icon' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'" @click="dictTab = 'icon'">图标</button>
    </div>
    <div v-if="dictTab === 'color'" class="space-y-2">
    <p class="text-xs text-slate-500">图标和拆分块按文字查这里。</p>
    <div v-for="(color, name) in colors ?? {}" :key="name" class="rounded border border-slate-700 p-2">
      <div class="mb-1 flex items-center justify-between gap-2">
        <span class="truncate">{{ name }}</span>
        <button type="button" class="text-xs text-rose-300" @click="removeColor(name)">删除</button>
      </div>
      <ColorField plain label="颜色" :model-value="color" @update="patchColor(name, $event)" />
    </div>
    <label class="block">名称<input class="field" v-model="colorName" maxlength="39" placeholder="例如 一级护理" @keydown.enter.prevent="addColor" /></label>
    <button type="button" class="rounded border border-slate-600 px-2 py-1 text-xs" @click="addColor">添加颜色</button>
    <label class="block">导入 JSON
      <textarea class="field editor-scrollbar h-28 font-mono" v-model="colorImport" placeholder='{"三级护理":"#18E718"}' />
    </label>
    <button type="button" class="rounded border border-slate-600 px-2 py-1 text-xs" @click="importColors">导入</button>
    <p v-if="colorImportMsg" class="text-xs text-slate-400">{{ colorImportMsg }}</p>
    </div>
    <div v-else class="space-y-2">
      <p class="text-xs text-slate-500">图标组件按字段文本查这里。颜色在「颜色」页。</p>
      <div v-for="(entry, name) in icons ?? {}" :key="name" class="rounded border border-slate-700 p-2">
        <div class="mb-1 flex items-center justify-between gap-2">
          <span class="truncate">{{ name }}</span>
          <button type="button" class="text-xs text-rose-300" @click="removeIcon(name)">删除</button>
        </div>
        <select class="field" :value="iconId(entry) || entry" @change="patchIcon(name, ($event.target as HTMLSelectElement).value)">
          <option v-for="opt in iconChoices" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
        </select>
      </div>
      <label class="block">名称<input class="field" v-model="iconName" maxlength="39" placeholder="例如 一级护理" @keydown.enter.prevent="addIcon" /></label>
      <button type="button" class="rounded border border-slate-600 px-2 py-1 text-xs" @click="addIcon">添加图标</button>
      <label class="block">导入 JSON
        <textarea class="field editor-scrollbar h-28 font-mono" v-model="iconImport" placeholder='{"三级护理":"care-3"}' />
      </label>
      <button type="button" class="rounded border border-slate-600 px-2 py-1 text-xs" @click="importIcons">导入</button>
      <p v-if="iconImportMsg" class="text-xs text-slate-400">{{ iconImportMsg }}</p>
      <div class="border-t border-slate-700 pt-2">
        <div class="mb-1 text-slate-300">系统图标</div>
        <p class="mb-2 text-xs text-slate-500">内置圆标之外，可从编辑器同一套 Tabler 开源库加入。加入后可在上面的字典和静态图标里选用。</p>
        <div v-for="id in Object.keys(library ?? {})" :key="id" class="mb-1 flex items-center justify-between gap-2">
          <span class="truncate">{{ id }}</span>
          <button type="button" class="text-xs text-rose-300" @click="removeLibraryIcon(id)">删除</button>
        </div>
        <button type="button" class="rounded border border-slate-600 px-2 py-1 text-xs" @click="tablerOpen = true">从开源库导入</button>
      </div>
      <TablerImport v-if="tablerOpen" @add="addLibraryIcon" @close="tablerOpen = false" />
    </div>
  </div>
  <div v-else-if="shape" class="space-y-2 p-3 text-sm">
    <label class="flex items-center gap-2">锁定
      <input type="checkbox" :checked="!!shape.locked" @change="emit('patchShape', { locked: ($event.target as HTMLInputElement).checked })" />
    </label>
    <div class="text-slate-400">{{ shape.type }}</div>
    <template v-if="shape.type === 'line'">
      <div class="grid grid-cols-2 gap-2">
        <label>x1<input class="field" type="number" :value="shape.x1" @input="emit('patchShape', { x1: num(($event.target as HTMLInputElement).value) })" /></label>
        <label>y1<input class="field" type="number" :value="shape.y1" @input="emit('patchShape', { y1: num(($event.target as HTMLInputElement).value) })" /></label>
        <label>x2<input class="field" type="number" :value="shape.x2" @input="emit('patchShape', { x2: num(($event.target as HTMLInputElement).value) })" /></label>
        <label>y2<input class="field" type="number" :value="shape.y2" @input="emit('patchShape', { y2: num(($event.target as HTMLInputElement).value) })" /></label>
      </div>
      <label class="block">线宽<input class="field" type="number" :value="shape.width ?? 1" @input="emit('patchShape', { width: num(($event.target as HTMLInputElement).value) })" /></label>
      <ColorField label="颜色" :model-value="shape.color ?? ''" @update="emit('patchShape', { color: $event })" />
    </template>
    <template v-else-if="shape.type === 'icon'">
      <div class="grid grid-cols-2 gap-2">
        <label>x<input class="field" type="number" :value="shape.x" @input="emit('patchShape', { x: num(($event.target as HTMLInputElement).value) })" /></label>
        <label>y<input class="field" type="number" :value="shape.y" @input="emit('patchShape', { y: num(($event.target as HTMLInputElement).value) })" /></label>
        <label>宽<input class="field" type="number" :value="shape.w" @input="emit('patchShape', { w: num(($event.target as HTMLInputElement).value) })" /></label>
        <label>高<input class="field" type="number" :value="shape.h" @input="emit('patchShape', { h: num(($event.target as HTMLInputElement).value) })" /></label>
      </div>
      <label class="block">来源
        <select class="field" :value="shape.mode === 'static' ? 'static' : 'field'" @change="emit('patchShape', ($event.target as HTMLSelectElement).value === 'static' ? { mode: 'static', icon: shape.icon || 'care-1', color: shape.color || '#FFFFFF' } : { mode: 'field' })">
          <option value="field">字段</option>
          <option value="static">静态</option>
        </select>
      </label>
      <template v-if="shape.mode === 'static'">
        <label class="block">图标
          <select class="field" :value="shape.icon || 'care-1'" @change="emit('patchShape', { icon: ($event.target as HTMLSelectElement).value })">
            <option v-for="opt in iconChoices" :key="opt.id" :value="opt.id">{{ opt.name }}</option>
          </select>
        </label>
        <ColorField label="颜色" :model-value="shape.color ?? '#FFFFFF'" @update="emit('patchShape', { color: $event })" />
      </template>
      <template v-else>
        <label class="block">字段<input class="field" maxlength="39" :value="shape.prop ?? ''" @input="emit('patchShape', { prop: ($event.target as HTMLInputElement).value })" /></label>
        <p class="text-xs text-slate-500">用这个字段的文本查页面图标字典和颜色字典。</p>
      </template>
    </template>
    <template v-else>
      <div class="grid grid-cols-2 gap-2">
        <label>x<input class="field" type="number" :value="shape.x" @input="emit('patchShape', { x: num(($event.target as HTMLInputElement).value) })" /></label>
        <label>y<input class="field" type="number" :value="shape.y" @input="emit('patchShape', { y: num(($event.target as HTMLInputElement).value) })" /></label>
        <label>宽<input class="field" type="number" :value="shape.w" @input="emit('patchShape', { w: num(($event.target as HTMLInputElement).value) })" /></label>
        <label>高<input class="field" type="number" :value="shape.h" @input="emit('patchShape', { h: num(($event.target as HTMLInputElement).value) })" /></label>
      </div>
      <ColorField v-if="shape.type !== 'image'" label="底色" :model-value="shape.bg ?? ''" @update="emit('patchShape', { bg: $event })" />
      <label v-if="shape.type === 'rect'" class="block">圆角<input class="field" type="number" :value="shape.radius ?? 0" @input="emit('patchShape', { radius: num(($event.target as HTMLInputElement).value) })" /></label>
      <template v-if="shape.type !== 'image'">
        <label class="block">边框宽<input class="field" type="number" :value="shape.border_w ?? 0" @input="emit('patchShape', { border_w: num(($event.target as HTMLInputElement).value) })" /></label>
        <ColorField label="边框色" :model-value="shape.border_color ?? ''" @update="emit('patchShape', { border_color: $event })" />
        <label class="block">阴影宽<input class="field" type="number" :value="shape.shadow?.width ?? 0" @input="emit('patchShape', { shadow: { ...shape.shadow, width: num(($event.target as HTMLInputElement).value) } })" /></label>
        <ColorField label="阴影色" :model-value="shape.shadow?.color ?? ''" @update="emit('patchShape', { shadow: { ...shape.shadow, color: $event } })" />
        <div class="grid grid-cols-2 gap-2">
          <label>阴影 ofs_x<input class="field" type="number" :value="shape.shadow?.ofs_x ?? 0" @input="emit('patchShape', { shadow: { ...shape.shadow, ofs_x: num(($event.target as HTMLInputElement).value) } })" /></label>
          <label>阴影 ofs_y<input class="field" type="number" :value="shape.shadow?.ofs_y ?? 0" @input="emit('patchShape', { shadow: { ...shape.shadow, ofs_y: num(($event.target as HTMLInputElement).value) } })" /></label>
        </div>
      </template>
      <template v-else>
        <label class="block">src<input class="field" :value="shape.src" @input="emit('patchShape', { src: ($event.target as HTMLInputElement).value })" /></label>
        <label class="block">url<input class="field" :value="shape.url ?? ''" @input="emit('patchShape', { url: ($event.target as HTMLInputElement).value })" /></label>
        <label class="btn inline-flex cursor-pointer">
          上传图片
          <input class="hidden" type="file" accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp" @change="uploadImage" />
        </label>
        <div v-if="uploadMsg" class="text-xs text-slate-400">{{ uploadMsg }}</div>
      </template>
    </template>
  </div>
  <div v-else-if="card && selection?.kind === 'card'" class="space-y-2 p-3 text-sm">
    <label class="flex items-center gap-2">锁定
      <input type="checkbox" :checked="!!card.locked" @change="emit('patchCard', { locked: ($event.target as HTMLInputElement).checked })" />
    </label>
    <div class="text-slate-400">卡片</div>
    <div class="grid grid-cols-2 gap-2">
      <label>x<input class="field" type="number" :value="card.x" @input="emit('patchCard', { x: num(($event.target as HTMLInputElement).value) })" /></label>
      <label>y<input class="field" type="number" :value="card.y" @input="emit('patchCard', { y: num(($event.target as HTMLInputElement).value) })" /></label>
      <label>宽<input class="field" type="number" :value="card.w" @input="emit('patchCard', { w: num(($event.target as HTMLInputElement).value) })" /></label>
      <label>高<input class="field" type="number" :value="card.h" @input="emit('patchCard', { h: num(($event.target as HTMLInputElement).value) })" /></label>
      <label>列<input class="field" type="number" min="1" max="8" :value="card.cols ?? 1" @input="emit('patchCard', { cols: num(($event.target as HTMLInputElement).value) })" /></label>
      <label>行<input class="field" type="number" min="1" max="8" :value="card.rows ?? 1" @input="emit('patchCard', { rows: num(($event.target as HTMLInputElement).value) })" /></label>
    </div>
    <label class="block">间距<input class="field" type="number" :value="card.gap ?? 0" @input="emit('patchCard', { gap: num(($event.target as HTMLInputElement).value) })" /></label>
    <label class="block">列宽，逗号分隔，0 表示平分<input class="field" :value="(card.col_w ?? []).join(',')" @input="emit('patchCard', { col_w: list(($event.target as HTMLInputElement).value) })" /></label>
    <label class="block">行高，逗号分隔，0 表示平分<input class="field" :value="(card.row_h ?? []).join(',')" @input="emit('patchCard', { row_h: list(($event.target as HTMLInputElement).value) })" /></label>
    <ColorField label="底色，留空透明" :model-value="card.bg ?? ''" @update="emit('patchCard', { bg: $event })" />
    <label class="block">圆角<input class="field" type="number" :value="card.radius ?? 0" @input="emit('patchCard', { radius: num(($event.target as HTMLInputElement).value) })" /></label>
    <label class="block">边框宽<input class="field" type="number" :value="card.border_w ?? 0" @input="emit('patchCard', { border_w: num(($event.target as HTMLInputElement).value) })" /></label>
    <ColorField label="边框色" :model-value="card.border_color ?? ''" @update="emit('patchCard', { border_color: $event })" />
    <label class="block">阴影宽<input class="field" type="number" :value="card.shadow?.width ?? 0" @input="emit('patchCard', { shadow: { ...card.shadow, width: num(($event.target as HTMLInputElement).value) } })" /></label>
    <ColorField label="阴影色" :model-value="card.shadow?.color ?? ''" @update="emit('patchCard', { shadow: { ...card.shadow, color: $event } })" />
    <div class="grid grid-cols-2 gap-2">
      <label>阴影 ofs_x<input class="field" type="number" :value="card.shadow?.ofs_x ?? 0" @input="emit('patchCard', { shadow: { ...card.shadow, ofs_x: num(($event.target as HTMLInputElement).value) } })" /></label>
      <label>阴影 ofs_y<input class="field" type="number" :value="card.shadow?.ofs_y ?? 0" @input="emit('patchCard', { shadow: { ...card.shadow, ofs_y: num(($event.target as HTMLInputElement).value) } })" /></label>
    </div>
  </div>
  <div v-else-if="item" class="space-y-2 p-3 text-sm">
    <div class="text-slate-400">{{ item.type }}</div>
    <div class="grid grid-cols-2 gap-2">
      <label>列<input class="field" type="number" :value="item.col ?? 0" @input="emit('patchItem', { col: num(($event.target as HTMLInputElement).value) })" /></label>
      <label>行<input class="field" type="number" :value="item.row ?? 0" @input="emit('patchItem', { row: num(($event.target as HTMLInputElement).value) })" /></label>
      <label>跨列<input class="field" type="number" :value="item.colspan ?? 1" @input="emit('patchItem', { colspan: num(($event.target as HTMLInputElement).value) })" /></label>
      <label>跨行<input class="field" type="number" :value="item.rowspan ?? 1" @input="emit('patchItem', { rowspan: num(($event.target as HTMLInputElement).value) })" /></label>
    </div>
    <label v-if="item.type === 'label'" class="block">文字<input class="field" maxlength="127" :value="item.text ?? ''" @input="emit('patchItem', { text: ($event.target as HTMLInputElement).value })" /></label>
    <template v-if="item.type !== 'label'">
      <label class="block">字段<input class="field" maxlength="39" :value="item.prop ?? ''" @input="emit('patchItem', { prop: ($event.target as HTMLInputElement).value })" /></label>
    </template>
    <template v-if="item.type === 'value'">
      <label class="block">标题<input class="field" maxlength="47" :value="item.title ?? ''" @input="emit('patchItem', { title: ($event.target as HTMLInputElement).value })" /></label>
      <label class="block">标题字体<input class="field" :value="item.title_font ?? ''" @input="emit('patchItem', { title_font: ($event.target as HTMLInputElement).value })" /></label>
      <ColorField label="标题颜色" :model-value="item.title_color ?? ''" @update="emit('patchItem', { title_color: $event })" />
      <label class="block">format<input class="field" :value="item.format ?? ''" @input="emit('patchItem', { format: ($event.target as HTMLInputElement).value })" /></label>
      <label class="block">左侧内边距<input class="field" type="number" :value="item.pad_x ?? 0" @input="emit('patchItem', { pad_x: num(($event.target as HTMLInputElement).value) })" /></label>
      <label class="block">标题间距<input class="field" type="number" :value="item.gap ?? 0" @input="emit('patchItem', { gap: num(($event.target as HTMLInputElement).value) })" /></label>
    </template>
    <template v-if="item.type === 'label' || item.type === 'value' || item.type === 'split'">
      <label class="block">字体<input class="field" :value="item.font ?? ''" @input="emit('patchItem', { font: ($event.target as HTMLInputElement).value })" /></label>
      <ColorField label="颜色" :model-value="item.color ?? ''" @update="emit('patchItem', { color: $event })" />
      <label v-if="item.type !== 'split'" class="flex items-center gap-2">粗体
        <input type="checkbox" :checked="item.bold === 1" @input="emit('patchItem', { bold: ($event.target as HTMLInputElement).checked ? 1 : 0 })" />
      </label>
    </template>
    <label v-if="item.type !== 'qrcode'" class="block">对齐
      <select class="field" :value="item.align ?? 'center'" @input="emit('patchItem', { align: ($event.target as HTMLSelectElement).value as HmiItem['align'] })">
        <option value="start">start</option>
        <option value="center">center</option>
        <option value="end">end</option>
      </select>
    </label>
    <template v-if="item.type === 'qrcode'">
      <label class="block">边长<input class="field" type="number" :value="item.size ?? 140" @input="emit('patchItem', { size: num(($event.target as HTMLInputElement).value) })" /></label>
    </template>
    <template v-if="item.type === 'split'">
      <label class="block">方向
        <select class="field" :value="item.flow === 'row' ? 'row' : 'column'" @input="emit('patchItem', { flow: ($event.target as HTMLSelectElement).value === 'row' ? 'row' : undefined })">
          <option value="column">纵向</option>
          <option value="row">横向</option>
        </select>
      </label>
      <label class="block">分隔符<input class="field" maxlength="1" :value="item.split ?? ','" @input="emit('patchItem', { split: ($event.target as HTMLInputElement).value })" /></label>
      <label class="block">{{ item.flow === 'row' ? '列宽' : '块高' }}<input class="field" type="number" :value="item.item_h ?? 73" @input="emit('patchItem', { item_h: num(($event.target as HTMLInputElement).value) })" /></label>
      <label class="block">块间距<input class="field" type="number" :value="item.gap ?? 8" @input="emit('patchItem', { gap: num(($event.target as HTMLInputElement).value) })" /></label>
      <ColorField label="默认底色" :model-value="item.default_color ?? '#7C7C7C'" @update="emit('patchItem', { default_color: $event })" />
      <p class="text-xs text-slate-500">每块底色按文字查页面颜色字典，没有则用默认底色。</p>
    </template>
  </div>
</template>

<style scoped>
.field { margin-top: 4px; width: 100%; border-radius: 4px; border: 1px solid rgb(51 65 85); background: rgb(15 23 42); padding: 4px 8px; }
</style>
