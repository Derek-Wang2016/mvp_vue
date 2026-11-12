<script setup lang="ts">
import { ref, useAttrs } from 'vue'

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const inputRef = ref<HTMLInputElement>()

function bound(name: 'min' | 'max'): number | undefined {
  const value = attrs[name]
  if (value == null || value === '') return undefined
  const n = Number(value)
  return Number.isFinite(n) ? n : undefined
}

function applyStep(direction: 1 | -1) {
  const el = inputRef.value
  if (!el || el.disabled) return
  const step = attrs.step != null && attrs.step !== '' ? Number(attrs.step) : 1
  const current = Number(el.value)
  let next = (Number.isFinite(current) ? current : 0) + direction * (Number.isFinite(step) ? step : 1)
  const min = bound('min')
  const max = bound('max')
  if (min != null) next = Math.max(min, next)
  if (max != null) next = Math.min(max, next)
  el.value = String(next)
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.dispatchEvent(new Event('change', { bubbles: true }))
}
</script>

<template>
  <div class="num-field">
    <input
      ref="inputRef"
      class="field"
      type="number"
      v-bind="attrs"
    />
    <button type="button" class="num-step num-step-up" tabindex="-1" aria-label="增加" @mousedown.prevent @click="applyStep(1)" />
    <button type="button" class="num-step num-step-down" tabindex="-1" aria-label="减少" @mousedown.prevent @click="applyStep(-1)" />
  </div>
</template>
