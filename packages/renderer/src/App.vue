<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, provide } from 'vue'
import type { PageSchema } from '@mvp-vue/schema'
import {
  DEFAULT_PAGE_WIDTH,
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_GRADIENT_COLOR_TO,
  buildGradientBackground,
} from '@mvp-vue/schema'
import { getPage } from './api'
import { PAGE_NAV_KEY, type PageNavContextValue } from './composables/usePageNav'
import { componentMap } from './components/componentMap'
import DataProvider from './components/DataProvider.vue'
import WatermarkOverlay from './components/WatermarkOverlay.vue'
import { WATERMARK_ENABLED, WATERMARK_TEXT } from './watermarkConfig'
import { isEmbeddedWebView, refineEmbeddedWebView, shouldShowFullscreenButton } from './utils/browserEnv'

// ---- URL parsing ----
function parsePageIdFromUrl(): number | null {
  const id = Number(new URLSearchParams(window.location.search).get('id'))
  return id > 0 ? id : null
}

function parseFullscreenParam(): boolean {
  const v = new URLSearchParams(window.location.search).get('fullscreen')
  return v === '1' || v === 'true'
}

function syncPageIdParam(pageId: number) {
  const url = new URL(window.location.href)
  url.searchParams.set('id', String(pageId))
  window.history.replaceState(null, '', url.toString())
}

function syncFullscreenParam(enabled: boolean) {
  const url = new URL(window.location.href)
  if (enabled) url.searchParams.set('fullscreen', '1')
  else url.searchParams.delete('fullscreen')
  window.history.replaceState(null, '', url.toString())
}

// ---- State ----
const pageId = ref<number | null>(parsePageIdFromUrl())
const schema = ref<PageSchema | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const fullscreenMode = ref(parseFullscreenParam())
const showFullscreenButton = ref(shouldShowFullscreenButton())
const containerRef = ref<HTMLDivElement | null>(null)
const scale = ref(1)
const viewport = ref({ left: 0, top: 0, width: DEFAULT_PAGE_WIDTH, height: DEFAULT_PAGE_HEIGHT })

/** 兼容旧字段 pageWidth/pageHeight；缺省时用设计稿默认尺寸 */
const pageWidth = computed(() => {
  const s = schema.value as (PageSchema & { pageWidth?: number }) | null
  return s?.width ?? s?.pageWidth ?? DEFAULT_PAGE_WIDTH
})
const pageHeight = computed(() => {
  const s = schema.value as (PageSchema & { pageHeight?: number }) | null
  return s?.height ?? s?.pageHeight ?? DEFAULT_PAGE_HEIGHT
})

// ---- Page Navigation ----
function navigateToPage(targetId: number) {
  if (targetId === pageId.value) return
  syncPageIdParam(targetId)
  pageId.value = targetId
}

const pageNavValue: PageNavContextValue = { navigateToPage }
provide(PAGE_NAV_KEY, pageNavValue)

// ---- Fullscreen ----
async function requestBrowserFullscreen() {
  if (isEmbeddedWebView()) return
  const el = containerRef.value
  if (!el || document.fullscreenElement === el) return
  try { await el.requestFullscreen() } catch { /* ignore */ }
}

async function exitBrowserFullscreen() {
  if (document.fullscreenElement) {
    try { await document.exitFullscreen() } catch { /* ignore */ }
  }
}

function applyFullscreenMode(enabled: boolean) {
  fullscreenMode.value = enabled
  syncFullscreenParam(enabled)
}

async function enterFullscreen() {
  applyFullscreenMode(true)
  await requestBrowserFullscreen()
}

async function exitFullscreen() {
  await exitBrowserFullscreen()
  applyFullscreenMode(false)
}

function toggleFullscreen() {
  if (fullscreenMode.value) exitFullscreen()
  else enterFullscreen()
}

// ---- Schema loading ----
watch(pageId, (id) => {
  if (!id) {
    schema.value = null
    error.value = '缺少参数 ?id='
    loading.value = false
    return
  }
  loading.value = true
  error.value = null
  schema.value = null
  getPage(id)
    .then((data) => {
      schema.value = data.schemaJson
      loading.value = false
    })
    .catch((err: Error) => {
      schema.value = null
      error.value = err.message
      loading.value = false
    })
}, { immediate: true })

// Auto-enter browser fullscreen when ?fullscreen=1 and schema loads
watch([schema, fullscreenMode], ([s, fm]) => {
  if (s && fm) requestBrowserFullscreen()
})

// Esc exits fullscreen mode
function onFullscreenChange() {
  if (!document.fullscreenElement && fullscreenMode.value) {
    applyFullscreenMode(false)
  }
}
onMounted(() => {
  document.addEventListener('fullscreenchange', onFullscreenChange)
  void refineEmbeddedWebView().then((embedded) => {
    if (embedded) showFullscreenButton.value = false
  })
})
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', onFullscreenChange))

// ---- Canvas scaling ----
function updateScale() {
  const container = containerRef.value
  if (!container) return
  const cw = container.clientWidth
  const ch = container.clientHeight
  const w = pageWidth.value
  const h = pageHeight.value

  if (fullscreenMode.value) {
    viewport.value = {
      left: Math.max(0, (cw - w) / 2),
      top: Math.max(0, (ch - h) / 2),
      width: w,
      height: h,
    }
    scale.value = 1
    return
  }

  const s = Math.min(cw / w, ch / h)
  scale.value = s
  viewport.value = {
    left: (cw - w * s) / 2,
    top: (ch - h * s) / 2,
    width: w * s,
    height: h * s,
  }
}

let resizeTimer: ReturnType<typeof setTimeout> | null = null
function onResize() {
  if (resizeTimer) clearTimeout(resizeTimer)
  resizeTimer = setTimeout(updateScale, 16)
}
onMounted(() => window.addEventListener('resize', onResize))
onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize)
  if (resizeTimer) clearTimeout(resizeTimer)
})

watch([schema, fullscreenMode, pageWidth, pageHeight], () => {
  setTimeout(updateScale, 0)
})
</script>

<template>
  <div
    ref="containerRef"
    class="relative w-screen h-screen bg-black"
    :class="fullscreenMode ? 'overflow-auto' : 'overflow-hidden'"
  >
    <!-- Fullscreen toggle（WebView 等嵌入式环境不显示） -->
    <button
      v-if="showFullscreenButton"
      type="button"
      :title="fullscreenMode ? '退出全屏（Esc）' : '全屏显示（1:1 尺寸）'"
      class="absolute top-3 right-3 z-[100] flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-white/85 bg-black/25 border border-white/15 backdrop-blur-sm hover:bg-white/15 hover:border-white/25 transition-colors shadow-lg shadow-black/20"
      @click="toggleFullscreen"
    >
      <!-- Exit fullscreen icon -->
      <svg v-if="fullscreenMode" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M9 9H5V5M15 9h4V5M9 15H5v4M15 15h4v4" />
      </svg>
      <!-- Enter fullscreen icon -->
      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M4 9V4h5M15 4h5v5M4 15v5h5M15 20h5v-5" />
      </svg>
      <span>{{ fullscreenMode ? '退出全屏' : '全屏' }}</span>
    </button>

    <!-- Viewport clip layer -->
    <div
      class="absolute overflow-hidden"
      :style="{
        left: viewport.left + 'px',
        top: viewport.top + 'px',
        width: viewport.width + 'px',
        height: viewport.height + 'px',
      }"
    >
      <!-- Canvas -->
      <div
        class="absolute left-0 top-0 text-white overflow-hidden"
        :style="{
          width: pageWidth + 'px',
          height: pageHeight + 'px',
          transformOrigin: '0 0',
          transform: scale === 1 ? undefined : `scale(${scale})`,
          background: schema
            ? buildGradientBackground(
                schema.bgColor ?? '#0d1520',
                schema.bgGradient ?? 'none',
                schema.bgColorTo ?? DEFAULT_GRADIENT_COLOR_TO,
              )
            : '#0d1520',
        }"
      >
        <!-- Loading -->
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-gray-900 z-50">
          <p class="text-gray-400 text-sm">加载中...</p>
        </div>

        <!-- Error -->
        <div v-else-if="error" class="absolute inset-0 flex items-center justify-center bg-gray-900 z-50">
          <div class="text-center">
            <p class="text-red-400 text-sm mb-2">{{ error }}</p>
            <p class="text-gray-500 text-xs">请在编辑器中保存大屏后，使用 ?id= 参数访问</p>
          </div>
        </div>

        <!-- Schema loaded -->
        <template v-if="schema">
          <!-- Data providers are set up reactively: watch schema.dataSources -->
          <!-- We use a keyed component to re-initialize DataProvider when dataSources change -->

          <!-- Background image -->
          <img
            v-if="schema.bgImage"
            :src="schema.bgImage"
            class="absolute inset-0 pointer-events-none select-none"
            :style="{ width: pageWidth + 'px', height: pageHeight + 'px', opacity: schema.bgOpacity ?? 1, objectFit: 'fill' }"
            draggable="false"
            alt=""
          />

          <!-- DataProvider wraps all components -->
          <DataProvider
            :key="`page-${pageId}`"
            :dataSources="schema.dataSources ?? []"
          >
            <!-- Components -->
            <template v-for="comp in schema.components" :key="comp.id">
              <div
                :style="{
                  position: 'absolute',
                  left: comp.x + 'px',
                  top: comp.y + 'px',
                  width: comp.w + 'px',
                  height: comp.h + 'px',
                  overflow: 'hidden',
                }"
              >
                <component
                  :is="componentMap[comp.type]"
                  v-if="componentMap[comp.type]"
                  :comp="comp"
                  :colorDict="schema.colorDict"
                  :iconDict="schema.iconDict"
                  :savedIcons="schema.savedIcons"
                  :abbrevDict="schema.abbrevDict"
                />
              </div>
            </template>
          </DataProvider>

          <!-- Watermark -->
          <WatermarkOverlay
            v-if="WATERMARK_ENABLED"
            :text="WATERMARK_TEXT"
            :width="pageWidth"
            :height="pageHeight"
          />
        </template>
      </div>
    </div>
  </div>
</template>
