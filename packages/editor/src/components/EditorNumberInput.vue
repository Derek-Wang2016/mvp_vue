<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  modelValue?: string | number
  min?: number | string
  max?: number | string
  step?: number | string
  placeholder?: string
  class?: string
  inputClass?: string
}>(), {
  modelValue: '',
})

const emit = defineEmits<{
  'update:modelValue': [val: string]
}>()

const inputRef = ref<HTMLInputElement>()

function clamp(val: number, min?: number | string, max?: number | string): number {
  let v = val
  if (min !== undefined && min !== '') v = Math.max(Number(min), v)
  if (max !== undefined && max !== '') v = Math.min(Number(max), v)
  return v
}

function applyStep(direction: 1 | -1, e: MouseEvent) {
  e.preventDefault()
  e.stopPropagation()
  const el = inputRef.value
  if (!el) return

  const stepVal = props.step !== undefined && props.step !== '' ? Number(props.step) : 1
  const parsed = props.modelValue === '' || props.modelValue === undefined || props.modelValue === null
    ? Number(el.value)
    : Number(props.modelValue)
  const current = Number.isFinite(parsed) ? parsed : 0
  const next = clamp(current + direction * stepVal, props.min, props.max)
  if (next === current) return

  emit('update:modelValue', String(next))
}
</script>

<template>
  <div :class="['editor-number-wrap relative', props.class ?? '']">
    <input
      ref="inputRef"
      type="number"
      :class="['editor-number-input', props.inputClass ?? '']"
      :value="modelValue"
      :step="step"
      :min="min"
      :max="max"
      :placeholder="placeholder"
      @change="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
    />
    <button
      type="button"
      class="editor-number-step editor-number-step-up"
      tabindex="-1"
      aria-label="增加"
      @mousedown.prevent
      @click="(e: MouseEvent) => applyStep(1, e)"
    />
    <button
      type="button"
      class="editor-number-step editor-number-step-down"
      tabindex="-1"
      aria-label="减少"
      @mousedown.prevent
      @click="(e: MouseEvent) => applyStep(-1, e)"
    />
  </div>
</template>
