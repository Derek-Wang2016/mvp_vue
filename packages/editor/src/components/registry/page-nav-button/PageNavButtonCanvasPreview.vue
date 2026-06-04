<script setup lang="ts">
import { storeToRefs } from 'pinia'
import PageNavButtonView from '../../PageNavButtonView.vue'
import { useEditorStore } from '../../../stores/editorStore'
import type { CanvasPreviewProps } from '../types'

const props = defineProps<CanvasPreviewProps>()
const { savedIcons } = storeToRefs(useEditorStore())
</script>

<template>
  <PageNavButtonView
    :label="(comp.props.label as string) ?? '跳转页面'"
    :font-size="(comp.props.fontSize as number) ?? 15"
    :layout-props="comp.props"
    :saved-icons="savedIcons"
  />
</template>
