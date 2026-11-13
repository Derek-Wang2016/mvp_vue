<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deleteHmiFile, listHmiFiles, uploadHmiFile, type HmiFileItem } from '../api'

const emit = defineEmits<{ close: [] }>()

const items = ref<HmiFileItem[]>([])
const error = ref('')
const loading = ref(false)
const uploading = ref(false)
const copiedId = ref<number | null>(null)
const pendingDelete = ref<HmiFileItem | null>(null)
const fileRef = ref<HTMLInputElement>()

async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = await listHmiFiles()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

async function onPickFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = '请选择图片文件'
    return
  }
  uploading.value = true
  error.value = ''
  try {
    await uploadHmiFile(file)
    await load()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '上传失败'
  } finally {
    uploading.value = false
  }
}

function copyText(text: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    return navigator.clipboard.writeText(text)
  }
  const input = document.createElement('textarea')
  input.value = text
  input.setAttribute('readonly', '')
  input.style.position = 'fixed'
  input.style.left = '-9999px'
  document.body.appendChild(input)
  input.select()
  const ok = document.execCommand('copy')
  input.remove()
  if (!ok) throw new Error('复制失败')
}

async function copyLink(item: HmiFileItem) {
  try {
    await copyText(item.url)
    copiedId.value = item.id
    error.value = ''
  } catch (err) {
    error.value = err instanceof Error ? err.message : '复制失败'
  }
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  const id = pendingDelete.value.id
  pendingDelete.value = null
  error.value = ''
  try {
    await deleteHmiFile(id)
    items.value = items.value.filter((item) => item.id !== id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '删除失败'
  }
}

onMounted(() => { void load() })
</script>

<template>
  <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60" @click.self="emit('close')">
    <div class="flex max-h-[80vh] w-[720px] max-w-[94vw] flex-col rounded-lg border border-slate-700 bg-slate-900 shadow-xl">
      <div class="flex items-center justify-between border-b border-slate-700 px-4 py-3">
        <p class="text-sm text-slate-200">图片管理</p>
        <div class="flex items-center gap-2">
          <button type="button" class="rounded bg-sky-600 px-2.5 py-1 text-xs text-white disabled:opacity-40" :disabled="uploading" @click="fileRef?.click()">
            {{ uploading ? '上传中…' : '上传图片' }}
          </button>
          <input ref="fileRef" type="file" accept="image/png,image/jpeg,image/webp" class="hidden" @change="onPickFile" />
          <button type="button" class="text-xs text-slate-400 hover:text-slate-200" @click="emit('close')">关闭</button>
        </div>
      </div>
      <p v-if="error" class="px-4 pt-2 text-[11px] text-rose-300">{{ error }}</p>
      <div class="editor-scrollbar flex-1 overflow-auto p-4">
        <p v-if="loading" class="text-xs text-slate-500">加载中…</p>
        <p v-else-if="items.length === 0" class="text-xs text-slate-500">还没有图片，点击上传。</p>
        <div v-else class="grid grid-cols-4 gap-3">
          <div v-for="item in items" :key="item.id" class="rounded-md border border-slate-700 bg-slate-950 p-2">
            <button type="button" class="block h-24 w-full rounded bg-black/30" @click="copyLink(item)">
              <img :src="item.url" :alt="item.name" class="h-full w-full object-contain" />
            </button>
            <p class="mt-1 truncate text-[11px] text-slate-300" :title="item.name">{{ item.name }}</p>
            <p class="truncate text-[10px] text-slate-500" :title="item.url">{{ item.url }}</p>
            <div class="mt-1 flex gap-2 text-[11px]">
              <button type="button" class="text-sky-300 hover:text-sky-200" @click="copyLink(item)">{{ copiedId === item.id ? '已复制' : '复制链接' }}</button>
              <button type="button" class="text-rose-300 hover:text-rose-200" @click="pendingDelete = item">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <div v-if="pendingDelete" class="fixed inset-0 z-[80] flex items-center justify-center bg-black/60" @click.self="pendingDelete = null">
    <div class="w-[420px] rounded-lg border border-slate-700 bg-slate-900 p-4">
      <p class="text-sm text-slate-200">删除「{{ pendingDelete.name }}」？已使用该链接的页面将无法再显示这张图。</p>
      <div class="mt-3 flex justify-end gap-2">
        <button type="button" class="rounded bg-slate-800 px-2 py-1 text-xs" @click="pendingDelete = null">取消</button>
        <button type="button" class="rounded bg-slate-800 px-2 py-1 text-xs text-rose-300" @click="confirmDelete">删除</button>
      </div>
    </div>
  </div>
</template>
