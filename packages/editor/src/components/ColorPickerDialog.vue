<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useColorPicker } from '../composables/useColorPicker'
import { parseColor } from './propertyPanel/shared'

const { open, session, confirmColor, closeColorPicker } = useColorPicker()

const localHex = ref('#000000')

const displayHex = computed(() => {
  const { r, g, b } = parseColor(localHex.value)
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
})

watch(
  () => open.value && session.value?.value,
  (v) => {
    if (!v || typeof v !== 'string') return
    const { r, g, b } = parseColor(v)
    localHex.value = `#${[r, g, b].map((n) => n.toString(16).padStart(2, '0')).join('')}`
  },
)

function onColorInput(e: Event) {
  localHex.value = (e.target as HTMLInputElement).value
}

function onHexInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value.trim()
  if (/^#[0-9a-f]{6}$/i.test(raw)) {
    localHex.value = raw.toLowerCase()
  } else {
    localHex.value = raw
  }
}

function onConfirm() {
  if (!/^#[0-9a-f]{6}$/i.test(displayHex.value)) return
  confirmColor(displayHex.value)
}

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeColorPicker()
  if (e.key === 'Enter') onConfirm()
}
</script>

<template>
  <Teleport to="body">
    <div
      v-if="open && session"
      class="fixed inset-0 z-[85] flex items-center justify-center bg-black/60 p-4"
      @click.self="closeColorPicker"
      @keydown="onKeyDown"
    >
      <div
        class="w-full max-w-[280px] rounded-xl border border-white/10 bg-[#15202d] p-4 shadow-2xl shadow-black/60"
        role="dialog"
        aria-label="选择颜色"
        @click.stop
      >
        <h4 class="text-sm font-medium text-slate-200">选择颜色</h4>
        <p class="mt-1 text-[11px] text-slate-500 leading-snug">
          点击下方色块或输入 #RRGGBB，不依赖列表行位置。
        </p>

        <div class="mt-4 flex items-center gap-3">
          <input
            type="color"
            class="editor-color-picker-dialog-input shrink-0"
            :value="displayHex"
            @input="onColorInput"
          />
          <input
            type="text"
            class="min-w-0 flex-1 rounded-md border border-white/15 bg-white/[0.08] px-2.5 py-1.5 font-mono text-xs text-slate-100 outline-none focus:border-indigo-400/50 focus:ring-1 focus:ring-indigo-400/30"
            spellcheck="false"
            :value="localHex"
            placeholder="#ff0000"
            @input="onHexInput"
          />
        </div>

        <div
          class="mt-3 h-10 w-full rounded-md border border-white/10"
          :style="{ backgroundColor: displayHex }"
        />

        <div class="mt-4 flex justify-end gap-2">
          <button
            type="button"
            class="rounded-md px-3 py-1.5 text-xs text-slate-400 transition-colors hover:text-slate-200"
            @click="closeColorPicker"
          >
            取消
          </button>
          <button
            type="button"
            class="rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-40"
            :disabled="!/^#[0-9a-f]{6}$/i.test(displayHex)"
            @click="onConfirm"
          >
            确定
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
