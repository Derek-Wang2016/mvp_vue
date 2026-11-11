<script setup lang="ts">
defineProps<{ label: string; modelValue?: string; plain?: boolean }>()
const emit = defineEmits<{ update: [value: string] }>()

function pickerValue(value: string | undefined) {
  return /^#[0-9a-fA-F]{6}$/.test(value ?? '') ? value! : '#000000'
}
</script>

<template>
  <label class="block">{{ label }}
    <span v-if="!plain" class="mt-0.5 block text-[10px] text-slate-500">#RRGGBB，或 color.字段名</span>
    <span class="mt-1 flex items-center gap-2">
      <input
        type="color"
        class="h-8 w-8 cursor-pointer rounded border border-slate-600 bg-transparent p-0"
        :value="pickerValue(modelValue)"
        @input="emit('update', ($event.target as HTMLInputElement).value.toUpperCase())"
      />
      <input class="field" :value="modelValue ?? ''" placeholder="#RRGGBB 或 color.字段" @input="emit('update', ($event.target as HTMLInputElement).value)" />
    </span>
  </label>
</template>

<style scoped>
.field { width: 100%; border-radius: 4px; border: 1px solid rgb(51 65 85); background: rgb(15 23 42); padding: 4px 8px; }
</style>
