<script setup lang="ts">
import { inject } from 'vue'
import type { CustomIconRecord, PageComponent } from '@mvp-vue/schema'
import { PAGE_NAV_KEY } from '../composables/usePageNav'
import PageNavButtonView from './PageNavButtonView.vue'

const props = defineProps<{
  comp: PageComponent
  savedIcons?: CustomIconRecord[]
}>()

const pageNav = inject(PAGE_NAV_KEY, null)

const label = (props.comp.props.label as string) ?? '跳转页面'
const fontSize = (props.comp.props.fontSize as number) ?? 15
const targetPageId = props.comp.props.targetPageId as number | null | undefined
const canNavigate = typeof targetPageId === 'number' && targetPageId > 0

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
    :font-size="fontSize"
    :layout-props="comp.props"
    :saved-icons="savedIcons"
    :interactive="canNavigate"
    @click="handleClick"
  />
</template>
