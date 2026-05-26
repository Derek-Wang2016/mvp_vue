<script setup lang="ts">
import PageNavButtonView from '../../PageNavButtonView.vue'
import type { CanvasPreviewProps } from '../types'

const props = defineProps<CanvasPreviewProps>()
</script>

<template>
  <PageNavButtonView
    :label="(comp.props.label as string) ?? '跳转页面'"
    :font-size="(comp.props.fontSize as number) ?? 15"
    :icon-preset="(comp.props.iconPreset as any) ?? 'arrow-right'"
    :icon-url="(comp.props.iconUrl as string) ?? ''"
    :colors="{
      textColor: comp.props.textColor as string,
      borderColor: comp.props.borderColor as string,
      bgColorFrom: comp.props.bgColorFrom as string,
      bgColorTo: comp.props.bgColorTo as string,
      glowColor: comp.props.glowColor as string,
    }"
  />
</template>
