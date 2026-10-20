<script setup lang="ts">
import { ref, watch } from 'vue'
import ColorSwatch from '../../ColorSwatch.vue'
import EditorNumberInput from '../../EditorNumberInput.vue'
import { PROP_LABEL, PROP_HINT, PROP_INPUT, PROP_NUMBER_WRAP, PROP_NUMBER_INNER, PROP_SELECT_COMPACT } from '../../propertyPanel/shared'
import { fetchEditableText, saveEditableText } from '../../../editableTextApi'
import type { ComponentPropertyFieldsProps } from '../types'

const props = defineProps<ComponentPropertyFieldsProps>()

const rowKey = ref((props.comp.props.rowKey as string) ?? '')
const content = ref('')
const status = ref('')
const busy = ref(false)

watch(() => props.comp.props.rowKey, (val) => {
  rowKey.value = (val as string) ?? ''
})

function saveKey() {
  props.updateProps({ rowKey: rowKey.value.trim() })
}

async function loadRow() {
  const key = rowKey.value.trim()
  if (!key) {
    status.value = '请先填写 KEY'
    return
  }
  busy.value = true
  status.value = ''
  try {
    const row = await fetchEditableText(key)
    content.value = row?.content ?? ''
    status.value = row ? '已读取' : '该 KEY 尚无数据行，保存后会新建'
  } catch (e) {
    status.value = e instanceof Error ? e.message : '读取失败'
  } finally {
    busy.value = false
  }
}

async function writeRow() {
  const key = rowKey.value.trim()
  if (!key) {
    status.value = '请先填写 KEY'
    return
  }
  props.updateProps({ rowKey: key })
  busy.value = true
  status.value = ''
  try {
    await saveEditableText(key, content.value)
    status.value = '已写入数据库'
  } catch (e) {
    status.value = e instanceof Error ? e.message : '保存失败'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <label v-if="!batch" class="block">
    <span :class="PROP_LABEL">数据行 KEY</span>
    <input
      :class="PROP_INPUT"
      v-model="rowKey"
      placeholder="唯一标识，例如 notice.title"
      @blur="saveKey"
      @keydown.enter="($event.target as HTMLInputElement).blur()"
    />
    <p :class="PROP_HINT">同一 KEY 只对应数据库中的一行，渲染端双击编辑会回写这一行。</p>
  </label>
  <label v-if="!batch" class="block">
    <span :class="PROP_LABEL">文本内容</span>
    <textarea
      v-model="content"
      rows="3"
      class="editor-scrollbar w-full mt-1 bg-white/[0.08] border border-white/15 rounded-md px-2.5 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-400/50 outline-none transition-colors resize-y"
      placeholder="读取后显示当前内容，保存时写入数据库"
    />
    <div class="flex gap-2 mt-1.5">
      <button
        type="button"
        class="px-2 py-1 text-[11px] rounded border border-white/15 text-slate-200 hover:bg-white/10 disabled:opacity-40"
        :disabled="busy"
        @click="loadRow"
      >读取</button>
      <button
        type="button"
        class="px-2 py-1 text-[11px] rounded bg-indigo-500/80 text-white hover:bg-indigo-500 disabled:opacity-40"
        :disabled="busy"
        @click="writeRow"
      >保存到数据行</button>
    </div>
    <p v-if="status" :class="PROP_HINT">{{ status }}</p>
  </label>
  <label class="block">
    <span :class="PROP_LABEL">字体</span>
    <select
      :class="PROP_SELECT_COMPACT"
      :value="(comp.props.fontFamily as string) ?? 'sans-serif'"
      @change="props.updateProps({ fontFamily: ($event.target as HTMLSelectElement).value })"
    >
      <option value="sans-serif">无衬线体</option>
      <option value="serif">衬线体</option>
      <option value="monospace">等宽字体</option>
      <option value="cursive">手写体</option>
      <option value="fantasy">装饰体</option>
      <option value="Share Tech Mono">数码字体</option>
    </select>
  </label>
  <label class="block">
    <span :class="PROP_LABEL">字号</span>
    <EditorNumberInput
      :class="PROP_NUMBER_WRAP"
      :input-class="PROP_NUMBER_INNER"
      :model-value="(comp.props.fontSize as number) ?? 20"
      @update:model-value="props.updateProps({ fontSize: Number($event) })"
    />
  </label>
  <label class="block">
    <span :class="PROP_LABEL">字重</span>
    <select
      :class="PROP_SELECT_COMPACT"
      :value="(comp.props.fontWeight as string) ?? 'normal'"
      @change="props.updateProps({ fontWeight: ($event.target as HTMLSelectElement).value })"
    >
      <option value="normal">正常</option>
      <option value="bold">加粗</option>
    </select>
  </label>
  <label class="block">
    <span :class="PROP_LABEL">文字颜色</span>
    <div class="flex items-center gap-2 mt-1">
      <ColorSwatch
        class="w-7 h-7 shrink-0 border border-white/10"
        :value="(comp.props.color as string) ?? '#ffffff'"
        @change="(hex: string) => props.updateProps({ color: hex })"
      />
      <span class="text-xs text-slate-400 font-mono">{{ (comp.props.color as string) ?? '#ffffff' }}</span>
    </div>
  </label>
  <label class="block">
    <span :class="PROP_LABEL">背景色</span>
    <div class="flex items-center gap-2 mt-1">
      <ColorSwatch
        class="w-7 h-7 shrink-0 border border-white/10"
        :value="(comp.props.backgroundColor as string) && (comp.props.backgroundColor as string) !== 'transparent' ? (comp.props.backgroundColor as string) : '#000000'"
        @change="(hex: string) => props.updateProps({ backgroundColor: hex })"
      />
      <button
        type="button"
        class="text-[11px] text-slate-400 hover:text-slate-200"
        @click="props.updateProps({ backgroundColor: 'transparent' })"
      >透明</button>
    </div>
  </label>
</template>
