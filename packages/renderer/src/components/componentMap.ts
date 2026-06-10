import type { ComponentType, PageComponent, ColorDictEntry, IconDictEntry, AbbrevDictEntry, CustomIconRecord } from '@mvp-vue/schema'
import type { Component } from 'vue'
import TextRenderer from './TextRenderer.vue'
import ImageRenderer from './ImageRenderer.vue'
import IconRenderer from './IconRenderer.vue'
import RectangleRenderer from './RectangleRenderer.vue'
import EllipseRenderer from './EllipseRenderer.vue'
import LineRenderer from './LineRenderer.vue'
import DatetimeRenderer from './DatetimeRenderer.vue'
import AnalogClockRenderer from './AnalogClockRenderer.vue'
import PageNavButtonRenderer from './PageNavButtonRenderer.vue'
import TableRenderer from './TableRenderer.vue'
import ChartRenderer from './ChartRenderer.vue'
import MapRenderer from './MapRenderer.vue'
import CardListRenderer from './CardListRenderer.vue'
import CardRenderer from './CardRenderer.vue'
import KeyValueTagRenderer from './KeyValueTagRenderer.vue'

export interface CompRendererProps {
  comp: PageComponent
  colorDict?: ColorDictEntry[]
  iconDict?: IconDictEntry[]
  savedIcons?: CustomIconRecord[]
  abbrevDict?: AbbrevDictEntry[]
}

export const componentMap: Record<ComponentType, Component<CompRendererProps> | null> = {
  'text': TextRenderer,
  'image': ImageRenderer,
  'icon': IconRenderer,
  'rectangle': RectangleRenderer,
  'ellipse': EllipseRenderer,
  'line': LineRenderer,
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
  'card': CardRenderer,
  'key-value-tag': KeyValueTagRenderer,
  'map': MapRenderer,
}
