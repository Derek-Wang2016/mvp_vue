<script setup lang="ts">
import { tabler } from '../icons/tabler'

withDefaults(defineProps<{ size?: number }>(), { size: 16 })
const emit = defineEmits<{ close: [] }>()
</script>

<template>
  <button
    type="button"
    class="dialog-close"
    title="关闭"
    aria-label="关闭"
    @click="emit('close')"
    v-html="tabler('x', size)"
  />
</template>

<style scoped>
/* 红色 X 图标按钮，对话框右上角统一用它关闭 */
.dialog-close {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border-radius: 6px;
  border: 1px solid rgb(244 63 94 / 0.22);
  background: rgb(244 63 94 / 0.1);
  color: rgb(251 113 133);
  transition: background 0.12s ease, color 0.12s ease, border-color 0.12s ease;
}
.dialog-close:hover {
  border-color: rgb(244 63 94 / 0.45);
  background: rgb(244 63 94 / 0.22);
  color: rgb(254 205 211);
}
.dialog-close:active { transform: translateY(1px); }
</style>
