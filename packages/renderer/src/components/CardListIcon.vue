<script setup lang="ts">
import type { IconDictEntry } from '@mvp-vue/schema'
import { Icon } from '@iconify/vue'

defineProps<{
  entry: IconDictEntry
  size?: string | number
  color?: string
}>()
</script>

<template>
  <span
    v-if="entry.iconType === 'custom' && entry.iconSvg"
    class="inline-flex shrink-0 items-center justify-center [&>svg]:h-full [&>svg]:w-full"
    :style="{ width: size, height: size, color }"
    v-html="entry.iconSvg"
  />
  <Icon
    v-else-if="entry.iconName"
    :icon="entry.iconName"
    :width="size ?? '1em'"
    :height="size ?? '1em'"
    :color="color"
    style="display: block"
  />
</template>
