<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  open?: boolean
  title?: string
  message?: string
  confirmLabel?: string
  danger?: boolean
  tone?: 'default' | 'warning' | 'danger'
  loading?: boolean
  /** 遮罩层级，需高于父级弹窗时使用，如 z-[80] */
  overlayClass?: string
}>(), {
  open: true,
  overlayClass: 'z-[60]',
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const confirmClass = computed(() => {
  if (props.danger || props.tone === 'danger') return 'bg-red-500 hover:bg-red-400 text-white'
  if (props.tone === 'warning') return 'bg-amber-500 hover:bg-amber-400 text-slate-900'
  return 'bg-indigo-500 hover:bg-indigo-400 text-white'
})

function onCancel() {
  if (!props.loading) emit('cancel')
}

function onBackdrop() {
  if (!props.loading) emit('cancel')
}
</script>

<template>
  <div v-if="open" class="fixed inset-0 flex items-center justify-center bg-black/60" :class="overlayClass" @click.self="onBackdrop">
    <div class="bg-[#15202d] border border-white/10 rounded-xl shadow-2xl shadow-black/60 w-[400px] max-w-[90vw] overflow-hidden">
      <div class="p-5">
        <h4 class="text-sm font-semibold text-slate-200 mb-2">{{ title || '确认' }}</h4>
        <p v-if="message" class="text-xs text-slate-400 leading-relaxed">{{ message }}</p>
        <div v-if="$slots.default" class="text-xs text-slate-400 leading-relaxed">
          <slot />
        </div>
      </div>
      <div class="flex justify-end gap-2 px-5 pb-5">
        <button
          class="text-xs px-4 py-1.5 rounded-md border border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors"
          :disabled="loading"
          @click="onCancel"
        >
          取消
        </button>
        <button
          class="text-xs px-4 py-1.5 rounded-md transition-colors disabled:opacity-50"
          :class="confirmClass"
          :disabled="loading"
          @click="emit('confirm')"
        >
          {{ loading ? '处理中…' : (confirmLabel || '确定') }}
        </button>
      </div>
    </div>
  </div>
</template>
