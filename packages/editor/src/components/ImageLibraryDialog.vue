<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { deleteHostedImage, hostedImageUrl, listHostedImages, uploadHostedImage, type HostedImageItem } from '../api'
import { getApiBase } from '../config'
import ConfirmDialog from './ConfirmDialog.vue'

const emit = defineEmits<{
  close: []
  select: [url: string]
}>()

const items = ref<HostedImageItem[]>([])
const error = ref('')
const loading = ref(false)
const uploading = ref(false)
const copiedId = ref<number | null>(null)
const pendingDelete = ref<HostedImageItem | null>(null)
const fileRef = ref<HTMLInputElement>()

function absoluteUrl(item: HostedImageItem) {
  return item.url.startsWith('http') ? item.url : `${getApiBase()}${item.url}`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    items.value = await listHostedImages()
  } catch (e) {
    error.value = e instanceof Error ? e.message : '加载失败'
  } finally {
    loading.value = false
  }
}

function onPickFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  ;(e.target as HTMLInputElement).value = ''
  if (!file) return
  if (!file.type.startsWith('image/')) {
    error.value = '请选择图片文件'
    return
  }
  if (file.size > 2 * 1024 * 1024) {
    error.value = '图片不能超过 2MB'
    return
  }
  const reader = new FileReader()
  reader.onload = async () => {
    uploading.value = true
    error.value = ''
    try {
      const name = file.name.replace(/\.[^.]+$/, '') || '图片'
      await uploadHostedImage(name, String(reader.result ?? ''))
      await load()
    } catch (err) {
      error.value = err instanceof Error ? err.message : '上传失败'
    } finally {
      uploading.value = false
    }
  }
  reader.readAsDataURL(file)
}

async function copyLink(item: HostedImageItem) {
  const url = absoluteUrl(item)
  await navigator.clipboard.writeText(url)
  copiedId.value = item.id
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  const id = pendingDelete.value.id
  pendingDelete.value = null
  error.value = ''
  try {
    await deleteHostedImage(id)
    items.value = items.value.filter((item) => item.id !== id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : '删除失败'
  }
}

onMounted(() => { void load() })
</script>

<template>
  <div class="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center" @mousedown.self="emit('close')">
    <div class="w-[720px] max-w-[94vw] max-h-[80vh] flex flex-col rounded-lg bg-[#121a26] border border-white/10 shadow-xl">
      <div class="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <p class="text-sm text-slate-200">图片库</p>
        <div class="flex items-center gap-2">
          <button
            type="button"
            class="px-2.5 py-1 text-xs rounded bg-indigo-500 text-white disabled:opacity-40"
            :disabled="uploading"
            @click="fileRef?.click()"
          >{{ uploading ? '上传中…' : '上传图片' }}</button>
          <input ref="fileRef" type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml" class="hidden" @change="onPickFile" />
          <button type="button" class="text-xs text-slate-400 hover:text-slate-200" @click="emit('close')">关闭</button>
        </div>
      </div>
      <p v-if="error" class="px-4 pt-2 text-[11px] text-rose-300">{{ error }}</p>
      <div class="editor-scrollbar flex-1 overflow-auto p-4">
        <p v-if="loading" class="text-xs text-slate-500">加载中…</p>
        <p v-else-if="items.length === 0" class="text-xs text-slate-500">还没有图片，点击上传。</p>
        <div v-else class="grid grid-cols-4 gap-3">
          <div v-for="item in items" :key="item.id" class="rounded-md border border-white/10 bg-white/[0.03] p-2">
            <button type="button" class="block w-full h-24 bg-black/30 rounded" @click="emit('select', absoluteUrl(item))">
              <img :src="hostedImageUrl(item.id)" :alt="item.name" class="w-full h-full object-contain" />
            </button>
            <p class="mt-1 text-[11px] text-slate-300 truncate" :title="item.name">{{ item.name }}</p>
            <div class="mt-1 flex gap-2 text-[11px]">
              <button type="button" class="text-indigo-300 hover:text-indigo-200" @click="emit('select', absoluteUrl(item))">使用</button>
              <button type="button" class="text-slate-400 hover:text-slate-200" @click="copyLink(item)">{{ copiedId === item.id ? '已复制' : '复制链接' }}</button>
              <button type="button" class="text-rose-300 hover:text-rose-200" @click="pendingDelete = item">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  <ConfirmDialog
    v-if="pendingDelete"
    overlay-class="z-[80]"
    tone="danger"
    title="删除图片"
    :message="`确定删除「${pendingDelete.name}」？已使用该链接的页面将无法再显示这张图。`"
    confirm-label="删除"
    @confirm="confirmDelete"
    @cancel="pendingDelete = null"
  />
</template>
