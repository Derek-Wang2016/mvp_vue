<script setup lang="ts">
import { computed, ref } from 'vue'
import { icons } from '@iconify-json/tabler'
import { paintSvg, toLvglSvg } from '../icons/lvglSvg'

const emit = defineEmits<{
  add: [icon: { id: string; svg: string }]
  close: []
}>()

const query = ref('')
const page = ref(0)
const msg = ref('')
const PAGE = 48

const names = Object.keys(icons.icons).concat(Object.keys(icons.aliases ?? {})).sort()

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return names
  return names.filter((name) => name.includes(q))
})
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE)))
const pageItems = computed(() => filtered.value.slice(page.value * PAGE, page.value * PAGE + PAGE))

function search(value: string) {
  query.value = value
  page.value = 0
}

function source(name: string): { body: string; width: number; height: number } | null {
  const alias = icons.aliases?.[name]
  const icon = icons.icons[alias?.parent ?? name]
  if (!icon?.body) return null
  return {
    body: icon.body,
    width: alias?.width ?? icon.width ?? icons.width ?? 24,
    height: alias?.height ?? icon.height ?? icons.height ?? 24,
  }
}

function preview(name: string): string {
  const icon = source(name)
  if (!icon) return ''
  const svg = toLvglSvg(icon.body, icon.width, icon.height)
  return svg ? paintSvg(svg, '#e2e8f0') : ''
}

function pick(name: string) {
  const icon = source(name)
  const svg = icon ? toLvglSvg(icon.body, icon.width, icon.height) : null
  if (!svg) {
    msg.value = `${name} 含有 LVGL 画不了的内容，未加入`
    return
  }
  emit('add', { id: `tabler:${name}`, svg })
  msg.value = `已加入 tabler:${name}`
}
</script>

<template>
  <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-6" @click.self="emit('close')">
    <div class="flex h-[70vh] w-[640px] max-w-full flex-col rounded-lg border border-slate-700 bg-slate-900 p-3 text-sm text-slate-200">
      <div class="mb-2 flex items-center justify-between">
        <span>Tabler 开源图标</span>
        <button type="button" class="text-slate-400" @click="emit('close')">关闭</button>
      </div>
      <input class="mb-2 rounded border border-slate-600 bg-slate-950 px-2 py-1" placeholder="搜索，例如 heart" :value="query" @input="search(($event.target as HTMLInputElement).value)" />
      <div class="editor-scrollbar grid min-h-0 flex-1 grid-cols-6 content-start gap-2 overflow-auto">
        <button
          v-for="name in pageItems"
          :key="name"
          type="button"
          class="flex flex-col items-center gap-1 rounded border border-slate-700 p-1 hover:border-sky-500"
          @click="pick(name)"
        >
          <span class="flex h-8 w-8 items-center justify-center [&>svg]:h-full [&>svg]:w-full" v-html="preview(name)" />
          <span class="w-full truncate text-center text-[10px] text-slate-400">{{ name }}</span>
        </button>
      </div>
      <div class="mt-2 flex items-center justify-between text-xs text-slate-400">
        <span>{{ msg || '点一下加入系统图标' }}</span>
        <span class="flex items-center gap-2">
          <button type="button" :disabled="page <= 0" @click="page -= 1">上一页</button>
          <span>{{ page + 1 }} / {{ pageCount }}</span>
          <button type="button" :disabled="page + 1 >= pageCount" @click="page += 1">下一页</button>
        </span>
      </div>
    </div>
  </div>
</template>
