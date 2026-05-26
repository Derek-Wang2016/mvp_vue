<script setup lang="ts">
import { inject } from 'vue'
import type { PageComponent, PageNavIconPreset } from '@mvp-vue/schema'
import { PAGE_NAV_KEY } from '../composables/usePageNav'
import PageNavButtonView from './PageNavButtonView.vue'

const props = defineProps<{ comp: PageComponent }>()

const pageNav = inject(PAGE_NAV_KEY, null)

const label = (props.comp.props.label as string) ?? '跳转页面'
const fontSize = (props.comp.props.fontSize as number) ?? 15
const iconPreset = ((props.comp.props.iconPreset as string) ?? 'arrow-right') as PageNavIconPreset
const iconUrl = (props.comp.props.iconUrl as string) ?? ''
const targetPageId = props.comp.props.targetPageId as number | null | undefined
const canNavigate = typeof targetPageId === 'number' && targetPageId > 0

function pickColors(props: Record<string, unknown>) {
  return {
    textColor: props.textColor as string | undefined,
    borderColor: props.borderColor as string | undefined,
    bgColorFrom: props.bgColorFrom as string | undefined,
    bgColorTo: props.bgColorTo as string | undefined,
    glowColor: props.glowColor as string | undefined,
  }
}

function navigateToPageHard(pageId: number) {
  const url = new URL(window.location.href)
  url.searchParams.set('id', String(pageId))
  window.location.href = url.toString()
}

function handleClick() {
  if (!canNavigate) return
  if (pageNav) pageNav.navigateToPage(targetPageId!)
  else navigateToPageHard(targetPageId!)
}
</script>

<template>
  <PageNavButtonView
    :label="label"
    :fontSize="fontSize"
    :iconPreset="iconPreset"
    :iconUrl="iconUrl"
    :colors="pickColors(comp.props)"
    :interactive="canNavigate"
    @click="handleClick"
  />
</template>
