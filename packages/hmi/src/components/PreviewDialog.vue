<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Stage from './Stage.vue'
import DialogClose from './DialogClose.vue'
import { currentPage, type HmiDocument } from '../types'
import { paintColor } from '../resolve'
import { tabler } from '../icons/tabler'

const props = defineProps<{ doc: HmiDocument; name?: string }>()
const emit = defineEmits<{ close: []; apply: [sample: Record<string, unknown>] }>()

function cloneDoc(value: HmiDocument): HmiDocument {
  return JSON.parse(JSON.stringify(value)) as HmiDocument
}

/** 预览用副本。数据改动只影响这份副本，关闭对话框即丢失。 */
const preview = ref<HmiDocument>(cloneDoc(props.doc))
const page = computed(() => currentPage(preview.value))
const pageNames = computed(() => ['index', ...Object.keys(preview.value.pages).filter((name) => name !== 'index')])
const keys = computed(() => Object.keys(preview.value.sample ?? {}))
const newKey = ref('')

function showPage(name: string) {
  if (!preview.value.pages[name]) return
  preview.value.active = name
}

/** 原来就是数字的字段，输入合法数字时仍写回数字；对象/数组按 JSON 文本编辑。 */
function setValue(key: string, raw: string) {
  const sample = preview.value.sample
  const current = sample[key]
  if (current !== null && typeof current === 'object') {
    try {
      sample[key] = JSON.parse(raw) as unknown
    } catch {
      sample[key] = raw
    }
    return
  }
  if (typeof current === 'number') {
    const num = Number(raw)
    sample[key] = raw.trim() !== '' && Number.isFinite(num) ? num : raw
    return
  }
  sample[key] = raw
}

function valueText(key: string): string {
  const value = preview.value.sample[key]
  if (value === null || typeof value !== 'object') return String(value ?? '')
  try {
    return JSON.stringify(value)
  } catch {
    return ''
  }
}

function removeKey(key: string) {
  delete preview.value.sample[key]
}

function addKey() {
  const key = newKey.value.trim()
  if (!key) return
  if (!(key in preview.value.sample)) preview.value.sample[key] = ''
  newKey.value = ''
}

function resetSample() {
  preview.value.sample = cloneDoc(props.doc).sample
}

const stageRef = ref<HTMLDivElement | null>(null)
const shooting = ref(false)
const shotNote = ref('')
/** 导出倍率。1 倍即设计稿尺寸，2 倍适合高清屏，3 倍用于印刷或放大展示。 */
const shotScale = ref(1)
const SHOT_SCALES = [1, 2, 3]

const shotSize = computed(() => `${preview.value.screen.w * shotScale.value}×${preview.value.screen.h * shotScale.value}`)

function fileName(): string {
  const base = (props.name ?? 'hmi').replace(/[\\/:*?"<>|\s]+/g, '_').slice(0, 60) || 'hmi'
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..+$/, '')
  return `${base}-${preview.value.active}-${stamp}.png`
}

/** 把 1:1 画面按所选倍率栅格化成 PNG 并保存。 */
async function downloadShot() {
  const el = stageRef.value
  if (!el || shooting.value) return
  shooting.value = true
  shotNote.value = '正在截图…'
  try {
    // modern-screenshot 走 foreignObject，由浏览器自己排版，Grid / Flex 和文字都对得上；
    // html2canvas 是自研渲染器，不认 CSS Grid，卡片会塌在一起。
    const { domToBlob } = await import('modern-screenshot')
    const { w, h } = preview.value.screen
    const scale = shotScale.value
    const blob = await domToBlob(el, {
      width: w,
      height: h,
      scale,
      backgroundColor: paintColor(page.value.bg, preview.value, '#0b1220'),
      // 内联 @font-face，避免 foreignObject 里字体缺失导致回退
      font: { preferredFormat: 'woff2' },
    })
    if (!blob) throw new Error('无法生成图片')
    await saveBlob(blob, fileName())
    shotNote.value = `已保存 ${shotSize.value} PNG`
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      shotNote.value = '已取消保存'
    } else {
      shotNote.value = error instanceof Error ? `截图失败：${error.message}` : '截图失败'
    }
  } finally {
    shooting.value = false
  }
}

/**
 * 优先走 File System Access API，能弹出系统保存框（内置浏览器里也更可靠）；
 * 不支持或激活态已过期时退回 <a download>，由浏览器直接落到下载目录。
 */
async function saveBlob(blob: Blob, name: string) {
  const picker = (window as unknown as {
    showSaveFilePicker?: (options: {
      suggestedName?: string
      types?: { description: string; accept: Record<string, string[]> }[]
    }) => Promise<{ createWritable: () => Promise<{ write: (data: Blob) => Promise<void>; close: () => Promise<void> }> }>
  }).showSaveFilePicker
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: name,
        types: [{ description: 'PNG 图片', accept: { 'image/png': ['.png'] } }],
      })
      const writable = await handle.createWritable()
      await writable.write(blob)
      await writable.close()
      return
    } catch (error) {
      // 用户主动取消就不要偷偷再下载一份
      if (error instanceof DOMException && error.name === 'AbortError') throw error
      // 其余情况（激活态过期、被策略拦截）退回普通下载
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <div class="preview-overlay" data-hmi-modal @click.self="emit('close')">
    <div class="preview-shell">
      <div class="preview-header">
        <span class="text-sm font-semibold text-sky-100">预览</span>
        <span class="preview-badge">1:1 · {{ preview.screen.w }}×{{ preview.screen.h }}</span>
        <span v-if="shotNote" class="text-[11px]" :class="shotNote.startsWith('截图失败') ? 'text-rose-300' : 'text-sky-300'">{{ shotNote }}</span>
        <span class="ml-auto flex items-center gap-2">
          <label class="preview-scale" title="导出倍率">
            <select v-model.number="shotScale" class="preview-scale-select" :disabled="shooting">
              <option v-for="s in SHOT_SCALES" :key="s" :value="s">{{ s }}×</option>
            </select>
            <span class="preview-scale-hint">{{ shotSize }}</span>
          </label>
          <button
            type="button"
            class="preview-shot-btn"
            :disabled="shooting"
            title="把当前页面导出为 PNG"
            @click="downloadShot"
          >
            <span class="preview-shot-icon" v-html="tabler(shooting ? 'loader-2' : 'camera')" />
            <span>{{ shooting ? '正在截图…' : '截图并下载' }}</span>
          </button>
          <DialogClose @close="emit('close')" />
        </span>      </div>
      <div class="preview-tabs" role="tablist">
        <button
          v-for="pageName in pageNames"
          :key="pageName"
          type="button"
          role="tab"
          class="preview-tab"
          :class="pageName === preview.active ? 'preview-tab-active' : ''"
          :aria-selected="pageName === preview.active"
          @click="showPage(pageName)"
        >{{ pageName }}</button>
      </div>
      <div class="flex min-h-0 flex-1">
        <div class="preview-stage-area editor-scrollbar">
          <div class="preview-screen">
            <div
              ref="stageRef"
              class="pointer-events-none cursor-default select-none"
              :style="{ width: preview.screen.w + 'px', height: preview.screen.h + 'px' }"
            >
              <Stage :doc="preview" :selection="null" :selected-keys="[]" :drag="null" :show-position="false" />
            </div>
          </div>
        </div>
        <aside class="preview-aside editor-scrollbar">
          <div class="mb-1 flex items-center justify-between">
            <span class="text-sm text-slate-200">数据</span>
            <span class="text-[11px] text-slate-500">{{ keys.length }} 个字段</span>
          </div>
          <p class="mb-3 text-[11px] leading-relaxed text-slate-500">改动即时显示在左侧，只作用在这份预览副本上；关闭即丢弃，除非点“写回编辑器”。</p>
          <div class="space-y-2">
            <label v-for="key in keys" :key="key" class="block">
              <span class="flex items-center justify-between gap-2">
                <span class="truncate font-mono text-[11px] text-slate-400" :title="key">{{ key }}</span>
                <button type="button" class="shrink-0 text-[11px] text-slate-500 hover:text-rose-300" @click="removeKey(key)">删除</button>
              </span>
              <input
                class="preview-field"
                :value="valueText(key)"
                @input="setValue(key, ($event.target as HTMLInputElement).value)"
              />
            </label>
          </div>
          <p v-if="!keys.length" class="text-xs text-slate-500">这份文档没有样例字段</p>
          <div class="mt-3 flex gap-2">
            <input v-model="newKey" class="preview-field mt-0 min-w-0 flex-1 font-mono" placeholder="新增字段名" @keyup.enter="addKey" />
            <button type="button" class="preview-btn" @click="addKey">添加</button>
          </div>
          <div class="mt-4 flex gap-2 border-t border-slate-700/70 pt-3">
            <button type="button" class="preview-btn" @click="resetSample">重置数据</button>
            <button type="button" class="preview-btn-primary" @click="emit('apply', { ...preview.sample })">写回编辑器</button>
          </div>
          <p class="mt-2 text-[11px] leading-relaxed text-slate-500">写回后编辑器的“样例数据”会替换为上面这组，需保存屏幕才会持久化。</p>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* 预览整体偏蓝、比编辑器的 slate-900/950 更亮一档，视觉上和编辑态区分开 */
.preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 70;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgb(0 0 0 / 0.7);
}
.preview-shell {
  display: flex;
  max-height: 94vh;
  width: min(1500px, 96vw);
  flex-direction: column;
  overflow: hidden;
  border-radius: 10px;
  border: 1px solid rgb(56 189 248 / 0.3);
  background: #101b2e;
  box-shadow: 0 28px 80px -24px rgb(14 165 233 / 0.45);
}
.preview-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 10px;
  border-bottom: 1px solid rgb(56 189 248 / 0.22);
  background: #152437;
  padding: 8px 14px;
}
.preview-badge {
  border-radius: 4px;
  background: rgb(56 189 248 / 0.14);
  padding: 2px 6px;
  font-size: 11px;
  color: #7dd3fc;
}
.preview-tabs {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  overflow-x: auto;
  border-bottom: 1px solid rgb(56 189 248 / 0.18);
  background: #0d1a2b;
  padding: 0 10px;
}
.preview-tab {
  flex-shrink: 0;
  border-bottom: 2px solid transparent;
  padding: 7px 12px;
  font-size: 12px;
  color: rgb(148 163 184);
}
.preview-tab:hover { color: rgb(226 232 240); }
.preview-tab-active {
  border-bottom-color: #38bdf8;
  color: #e0f2fe;
  background: rgb(56 189 248 / 0.1);
}
/* 屏幕外的画布底比编辑器更亮，1:1 画面边界更清楚 */
.preview-stage-area {
  min-width: 0;
  flex: 1;
  overflow: auto;
  background: #1a2436;
  padding: 20px;
}
.preview-screen {
  width: max-content;
  box-shadow: 0 10px 40px -8px rgb(0 0 0 / 0.65);
}
.preview-aside {
  width: 360px;
  flex-shrink: 0;
  overflow-y: auto;
  border-left: 1px solid rgb(56 189 248 / 0.18);
  background: #0e1828;
  padding: 12px;
}
.preview-field {
  margin-top: 4px;
  width: 100%;
  border-radius: 6px;
  border: 1px solid rgb(255 255 255 / 0.15);
  background: rgb(2 6 23);
  padding: 4px 8px;
  font-size: 12px;
  color: rgb(241 245 249);
  outline: none;
}
.preview-field:focus { border-color: rgb(56 189 248); }
.preview-btn {
  border-radius: 4px;
  background: rgb(51 65 85);
  padding: 4px 10px;
  font-size: 12px;
  color: rgb(226 232 240);
}
.preview-btn:hover { background: rgb(71 85 105); }
.preview-btn:disabled { opacity: 0.45; cursor: not-allowed; }
/* 截图是预览里最常用的动作，用高亮实心按钮 + 相机图标把它拎出来 */
.preview-shot-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  border: 1px solid rgb(125 211 252 / 0.55);
  background: linear-gradient(180deg, #0ea5e9, #0369a1);
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #f0f9ff;
  box-shadow: 0 2px 10px -2px rgb(14 165 233 / 0.7), inset 0 1px 0 rgb(255 255 255 / 0.25);
  transition: transform 0.12s ease, box-shadow 0.12s ease, filter 0.12s ease;
}
.preview-shot-btn:hover {
  filter: brightness(1.12);
  box-shadow: 0 4px 16px -2px rgb(14 165 233 / 0.85), inset 0 1px 0 rgb(255 255 255 / 0.3);
}
.preview-shot-btn:active { transform: translateY(1px); }
.preview-shot-btn:disabled {
  cursor: progress;
  filter: saturate(0.6) brightness(0.9);
  box-shadow: none;
}
.preview-shot-icon { display: inline-flex; }
.preview-shot-icon :deep(svg) { width: 15px; height: 15px; }
.preview-shot-btn:disabled .preview-shot-icon :deep(svg) { animation: shot-spin 0.9s linear infinite; }
@keyframes shot-spin { to { transform: rotate(360deg); } }
/* 倍率选择：低调的描边小控件，不抢截图按钮的注意力 */
.preview-scale {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border-radius: 6px;
  border: 1px solid rgb(125 211 252 / 0.25);
  background: rgb(56 189 248 / 0.08);
  padding: 3px 8px 3px 4px;
}
.preview-scale-select {
  border-radius: 4px;
  border: none;
  background: rgb(2 6 23);
  padding: 2px 4px;
  font-size: 12px;
  color: rgb(224 242 254);
  outline: none;
  cursor: pointer;
}
.preview-scale-select:disabled { opacity: 0.5; cursor: not-allowed; }
.preview-scale-hint {
  font-family: ui-monospace, SFMono-Regular, monospace;
  font-size: 11px;
  color: rgb(148 163 184);
  font-variant-numeric: tabular-nums;
}
.preview-btn-primary { border-radius: 4px; background: #0369a1; padding: 4px 10px; font-size: 12px; color: white; }
.preview-btn-primary:hover { background: #0284c7; }
</style>
