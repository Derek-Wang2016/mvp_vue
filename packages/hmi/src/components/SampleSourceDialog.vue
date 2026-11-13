<script setup lang="ts">
import { onMounted, ref } from 'vue'
import {
  activateSampleSource,
  createSampleSource,
  deleteSampleSource,
  listSampleSources,
  testSampleRequest,
  updateSampleSource,
  type HmiSampleDraft,
  type HmiSampleSource,
} from '../api'
import { getApiBase } from '../config'

const emit = defineEmits<{ close: []; apply: [data: unknown] }>()

const items = ref<HmiSampleSource[]>([])
const error = ref('')
const busy = ref(false)
const selectedId = ref<number | null>(null)
const draft = ref<HmiSampleDraft>(blank())
const responseText = ref('')

function blank(): HmiSampleDraft {
  return { name: '未命名样例', mode: 'json', method: 'GET', url: '', body: '', paramsJson: '{}', sampleJson: '{}' }
}

function loadDraft(item: HmiSampleSource) {
  if (item.id === selectedId.value) return
  selectedId.value = item.id
  draft.value = {
    name: item.name,
    mode: item.mode,
    method: item.method,
    url: item.url,
    body: item.body,
    paramsJson: item.paramsJson,
    sampleJson: item.sampleJson,
  }
  responseText.value = ''
  error.value = ''
}

const savedHint = ref('')

async function reload(keepDraft = false) {
  items.value = await listSampleSources()
  if (keepDraft) return
  const current = items.value.find((item) => item.id === selectedId.value) ?? items.value.find((item) => item.active)
  if (current) loadDraft(current)
}

async function save(): Promise<number | null> {
  const payload = { ...draft.value, name: draft.value.name.trim() }
  if (!payload.name) throw new Error('请填写名称')
  JSON.parse(payload.paramsJson || '{}')
  if (payload.mode === 'json') {
    try {
      JSON.parse(payload.sampleJson || '{}')
    } catch {
      throw new Error('手写 JSON 无法解析')
    }
  }
  const saved = selectedId.value
    ? await updateSampleSource(selectedId.value, payload)
    : await createSampleSource(payload)
  selectedId.value = saved.id
  items.value = await listSampleSources()
  const active = items.value.find((item) => item.id === saved.id)?.active
  if (active && payload.mode === 'json') emit('apply', JSON.parse(payload.sampleJson || '{}'))
  return saved.id
}

async function activate() {
  busy.value = true
  error.value = ''
  try {
    const id = await save()
    if (id == null) return
    const data = await activateSampleSource(id)
    responseText.value = JSON.stringify(data, null, 2)
    emit('apply', data)
    await reload()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '激活失败'
  } finally {
    busy.value = false
  }
}

async function randomize() {
  busy.value = true
  error.value = ''
  savedHint.value = ''
  try {
    const res = await fetch(`${getApiBase()}/api/demo/hmi-patient`)
    if (!res.ok) throw new Error('随机样例接口失败')
    const body = await res.json() as Record<string, unknown>
    const row = Array.isArray(body.obj) ? (body.obj[0] ?? {}) : body
    draft.value = { ...draft.value, mode: 'json', sampleJson: JSON.stringify(row, null, 2) }
    const active = items.value.find((item) => item.id === selectedId.value)?.active
    if (selectedId.value != null && active) {
      await save()
      savedHint.value = '已换一组随机数据，画面已更新'
    } else {
      savedHint.value = '已生成，保存后写入这条样例'
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : '随机生成失败'
  } finally {
    busy.value = false
  }
}

async function testRequest() {
  busy.value = true
  error.value = ''
  savedHint.value = ''
  try {
    const result = await testSampleRequest({
      method: draft.value.method,
      url: draft.value.url,
      body: draft.value.body,
      paramsJson: draft.value.paramsJson,
    })
    responseText.value = JSON.stringify(result, null, 2)
    savedHint.value = `已返回 ${result.status}`
  } catch (err) {
    error.value = err instanceof Error ? err.message : '测试失败'
  } finally {
    busy.value = false
  }
}

async function saveOnly() {
  busy.value = true
  error.value = ''
  try {
    await save()
    savedHint.value = items.value.find((item) => item.id === selectedId.value)?.active && draft.value.mode === 'json'
      ? '已保存，画面已更新'
      : '已保存'
  } catch (err) {
    error.value = err instanceof Error ? err.message : '保存失败'
  } finally {
    busy.value = false
  }
}

async function remove() {
  if (selectedId.value == null) return
  busy.value = true
  error.value = ''
  try {
    await deleteSampleSource(selectedId.value)
    selectedId.value = null
    draft.value = blank()
    await reload()
  } catch (err) {
    error.value = err instanceof Error ? err.message : '删除失败'
  } finally {
    busy.value = false
  }
}

onMounted(() => {
  void reload().catch((err: unknown) => {
    error.value = err instanceof Error ? err.message : '无法读取样例'
  })
})
</script>

<template>
  <div class="fixed inset-0 z-[70] flex items-center justify-center bg-black/60" @click.self="emit('close')">
    <div class="flex h-[86vh] w-[min(1080px,94vw)] flex-col rounded-lg border border-slate-700 bg-slate-900 p-4">
      <div class="mb-3 flex items-center justify-between">
        <span>样例数据</span>
        <button type="button" class="text-xs text-slate-400" @click="emit('close')">关闭</button>
      </div>
      <p v-if="error" class="mb-2 text-xs text-rose-300">{{ error }}</p>
      <div class="grid min-h-0 flex-1 grid-cols-[220px_1fr] gap-3">
        <div class="editor-scrollbar overflow-auto rounded border border-slate-700 p-2">
          <button type="button" class="mb-2 w-full rounded bg-slate-800 px-2 py-1 text-xs" @click="selectedId = null; draft = blank(); responseText = ''">新建</button>
          <button
            v-for="item in items"
            :key="item.id"
            type="button"
            class="mb-1 block w-full truncate rounded px-2 py-1 text-left text-sm"
            :class="item.id === selectedId ? 'bg-sky-500/20 text-sky-200' : 'hover:bg-slate-800'"
            @click="loadDraft(item)"
          >
            {{ item.name }}
            <span v-if="item.active" class="ml-1 text-[10px] text-emerald-400">当前</span>
          </button>
          <p v-if="!items.length" class="text-xs text-slate-500">还没有样例</p>
        </div>
        <div class="flex min-h-0 flex-1 flex-col gap-2 pr-1 text-sm">
          <div class="editor-scrollbar min-h-0 flex-1 space-y-2 overflow-auto">
          <label class="block">名称<input v-model="draft.name" class="field" /></label>
          <div class="flex gap-2">
            <button type="button" class="rounded px-2 py-1 text-xs" :class="draft.mode === 'json' ? 'bg-slate-700' : 'bg-slate-800'" @click="draft.mode = 'json'">手写 JSON</button>
            <button type="button" class="rounded px-2 py-1 text-xs" :class="draft.mode === 'http' ? 'bg-slate-700' : 'bg-slate-800'" @click="draft.mode = 'http'">请求地址</button>
            <button v-if="draft.mode === 'json'" type="button" class="rounded bg-slate-800 px-2 py-1 text-xs" :disabled="busy" @click="randomize">随机生成</button>
          </div>
          <template v-if="draft.mode === 'http'">
            <div class="flex gap-2">
              <label class="block w-28">方法
                <select v-model="draft.method" class="field">
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </label>
              <label class="block min-w-0 flex-1">地址<input v-model="draft.url" class="field" placeholder="https://example/api，可用 {{参数}}" /></label>
            </div>
            <label class="block">参数 JSON<input v-model="draft.paramsJson" class="field font-mono text-xs" placeholder='{"id":"1"}' /></label>
            <label v-if="draft.method === 'POST'" class="block">Body
              <textarea v-model="draft.body" class="editor-scrollbar field h-24 font-mono text-xs" placeholder='{"patientId":"{{id}}"}' />
            </label>
            <button type="button" class="rounded bg-slate-800 px-2 py-1 text-xs" :disabled="busy" @click="testRequest">测试请求</button>
          </template>
          <label v-else class="block">手写 JSON
            <textarea v-model="draft.sampleJson" class="editor-scrollbar field h-64 font-mono text-xs" />
          </label>
          <label v-if="responseText" class="block">请求与回送
            <textarea readonly :value="responseText" class="editor-scrollbar field h-40 font-mono text-xs" />
          </label>
          <p class="text-xs text-slate-500">激活后写入当前预览。接口整包会取 obj[0]。地址和 Body 里的 &#123;&#123;参数&#125;&#125; 会被替换。不会写入设备 JSON。</p>
          </div>
          <div class="flex shrink-0 items-center justify-end gap-2 border-t border-slate-700 pt-2">
            <span v-if="savedHint" class="mr-auto text-xs text-emerald-400">{{ savedHint }}</span>
            <button type="button" class="rounded bg-slate-800 px-2 py-1 text-xs text-rose-300" :disabled="busy || selectedId == null" @click="remove">删除</button>
            <button type="button" class="rounded bg-slate-800 px-2 py-1 text-xs" :disabled="busy" @click="saveOnly">保存</button>
            <button type="button" class="rounded bg-sky-700 px-2 py-1 text-xs" :disabled="busy" @click="activate">激活</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.field { margin-top: 4px; width: 100%; border-radius: 6px; border: 1px solid rgb(255 255 255 / 0.15); background: rgb(15 23 42); padding: 6px 10px; font-size: 12px; color: rgb(241 245 249); outline: none; }
</style>
