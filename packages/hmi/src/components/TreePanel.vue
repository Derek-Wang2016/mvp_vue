<script setup lang="ts">
import type { HmiNode } from '../types'

defineProps<{
  nodes: HmiNode[]
  pathPrefix?: number[]
  selected: number[]
}>()

const emit = defineEmits<{ select: [path: number[]] }>()

function label(node: HmiNode) {
  return node.id || node.prop || node.title || node.type
}

function same(a: number[], b: number[]) {
  return a.join('.') === b.join('.')
}
</script>

<template>
  <ul class="space-y-0.5 text-sm">
    <li v-for="(node, index) in nodes" :key="index">
      <button
        type="button"
        class="w-full truncate rounded px-2 py-1 text-left hover:bg-slate-800"
        :class="same([...(pathPrefix ?? []), index], selected) ? 'bg-sky-900 text-sky-100' : 'text-slate-300'"
        @click="emit('select', [...(pathPrefix ?? []), index])"
      >
        <span class="mr-1 text-slate-500">{{ node.type }}</span>{{ label(node) }}
      </button>
      <div v-if="node.children?.length" class="ml-3 border-l border-slate-700 pl-2">
        <TreePanel
          :nodes="node.children"
          :path-prefix="[...(pathPrefix ?? []), index]"
          :selected="selected"
          @select="emit('select', $event)"
        />
      </div>
    </li>
  </ul>
</template>
