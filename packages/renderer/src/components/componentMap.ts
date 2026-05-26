import type { ComponentType, PageComponent, ColorDictEntry, IconDictEntry, AbbrevDictEntry } from '@mvp-vue/schema'
import type { Component } from 'vue'
import TextRenderer from './TextRenderer.vue'
import ImageRenderer from './ImageRenderer.vue'
import DatetimeRenderer from './DatetimeRenderer.vue'
import AnalogClockRenderer from './AnalogClockRenderer.vue'
import PageNavButtonRenderer from './PageNavButtonRenderer.vue'
import TableRenderer from './TableRenderer.vue'
import ChartRenderer from './ChartRenderer.vue'
import MapRenderer from './MapRenderer.vue'
import CardListRenderer from './CardListRenderer.vue'

export interface CompRendererProps {
  comp: PageComponent
  colorDict?: ColorDictEntry[]
  iconDict?: IconDictEntry[]
  abbrevDict?: AbbrevDictEntry[]
}

export const componentMap: Record<ComponentType, Component<CompRendererProps> | null> = {
  'text': TextRenderer,
  'image': ImageRenderer,
  'bar-chart': ChartRenderer,
  'line-chart': ChartRenderer,
  'pie-chart': ChartRenderer,
  'table': TableRenderer,
  'iframe': null,
  'video': null,
  'datetime': DatetimeRenderer,
  'analog-clock': AnalogClockRenderer,
  'page-nav-button': PageNavButtonRenderer,
  'card-list': CardListRenderer,
  'map': MapRenderer,
}
