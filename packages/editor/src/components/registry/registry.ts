import type { ComponentType } from '@mvp-vue/schema'
import type { EditorRegistry } from './types'
import { textDefaultProps, textDefaultSize } from './text/defaults'
import { imageDefaultProps, imageDefaultSize } from './image/defaults'
import { datetimeDefaultProps, datetimeDefaultSize } from './datetime/defaults'
import { analogClockDefaultProps, analogClockDefaultSize } from './analog-clock/defaults'
import { pageNavButtonDefaultProps, pageNavButtonDefaultSize } from './page-nav-button/defaults'
import { tableDefaultProps, tableDefaultSize } from './table/defaults'
import { chartDefaultProps, chartDefaultSize } from './chart/defaults'
import { cardListDefaultProps, cardListDefaultSize } from './card-list/defaults'
import { cardDefaultProps, cardDefaultSize } from './card/defaults'
import { keyValueTagDefaultProps, keyValueTagDefaultSize } from './key-value-tag/defaults'
import { iconDefaultProps, iconDefaultSize } from './icon/defaults'
import { rectangleDefaultProps, rectangleDefaultSize } from './rectangle/defaults'
import { lineDefaultProps, lineDefaultSize } from './line/defaults'
import { mapDefaultProps, mapDefaultSize } from './map/defaults'

// Stubs (fallback for types not yet implemented)
import StubPropertyFields from './StubPropertyFields.vue'
import StubCanvasPreview from './StubCanvasPreview.vue'
import StubDataFields from './StubDataFields.vue'

// Real component implementations
import TextPropertyFields from './text/TextPropertyFields.vue'
import TextCanvasPreview from './text/TextCanvasPreview.vue'
import TextDataFields from './text/TextDataFields.vue'
import ImagePropertyFields from './image/ImagePropertyFields.vue'
import ImageCanvasPreview from './image/ImageCanvasPreview.vue'
import DatetimePropertyFields from './datetime/DatetimePropertyFields.vue'
import DatetimeCanvasPreview from './datetime/DatetimeCanvasPreview.vue'
import AnalogClockPropertyFields from './analog-clock/AnalogClockPropertyFields.vue'
import AnalogClockCanvasPreview from './analog-clock/AnalogClockCanvasPreview.vue'
import PageNavButtonPropertyFields from './page-nav-button/PageNavButtonPropertyFields.vue'
import PageNavButtonCanvasPreview from './page-nav-button/PageNavButtonCanvasPreview.vue'
import ChartPropertyFields from './chart/ChartPropertyFields.vue'
import ChartCanvasPreview from './chart/ChartCanvasPreview.vue'
import ChartDataFields from './chart/ChartDataFields.vue'
import TablePropertyFields from './table/TablePropertyFields.vue'
import TableCanvasPreview from './table/TableCanvasPreview.vue'
import MapPropertyFields from './map/MapPropertyFields.vue'
import MapCanvasPreview from './map/MapCanvasPreview.vue'
import CardListPropertyFields from './card-list/CardListPropertyFields.vue'
import CardListCanvasPreview from './card-list/CardListCanvasPreview.vue'
import CardListDataFields from './card-list/CardListDataFields.vue'
import CardPropertyFields from './card/CardPropertyFields.vue'
import CardCanvasPreview from './card/CardCanvasPreview.vue'
import CardDataFields from './card/CardDataFields.vue'
import KeyValueTagPropertyFields from './key-value-tag/KeyValueTagPropertyFields.vue'
import KeyValueTagCanvasPreview from './key-value-tag/KeyValueTagCanvasPreview.vue'
import KeyValueTagDataFields from './key-value-tag/KeyValueTagDataFields.vue'
import IconPropertyFields from './icon/IconPropertyFields.vue'
import IconCanvasPreview from './icon/IconCanvasPreview.vue'
import RectanglePropertyFields from './rectangle/RectanglePropertyFields.vue'
import RectangleCanvasPreview from './rectangle/RectangleCanvasPreview.vue'
import LinePropertyFields from './line/LinePropertyFields.vue'
import LineCanvasPreview from './line/LineCanvasPreview.vue'

const chartDef = {
  defaultProps: chartDefaultProps,
  defaultSize: chartDefaultSize,
  PropertyFields: ChartPropertyFields,
  CanvasPreview: ChartCanvasPreview,
  DataFields: ChartDataFields,
}

export const editorRegistry: EditorRegistry = {
  text: {
    defaultProps: textDefaultProps,
    defaultSize: textDefaultSize,
    PropertyFields: TextPropertyFields,
    CanvasPreview: TextCanvasPreview,
    DataFields: TextDataFields,
  },
  image: {
    defaultProps: imageDefaultProps,
    defaultSize: imageDefaultSize,
    PropertyFields: ImagePropertyFields,
    CanvasPreview: ImageCanvasPreview,
  },
  icon: {
    defaultProps: iconDefaultProps,
    defaultSize: iconDefaultSize,
    PropertyFields: IconPropertyFields,
    CanvasPreview: IconCanvasPreview,
  },
  rectangle: {
    defaultProps: rectangleDefaultProps,
    defaultSize: rectangleDefaultSize,
    PropertyFields: RectanglePropertyFields,
    CanvasPreview: RectangleCanvasPreview,
  },
  line: {
    defaultProps: lineDefaultProps,
    defaultSize: lineDefaultSize,
    PropertyFields: LinePropertyFields,
    CanvasPreview: LineCanvasPreview,
  },
  datetime: {
    defaultProps: datetimeDefaultProps,
    defaultSize: datetimeDefaultSize,
    PropertyFields: DatetimePropertyFields,
    CanvasPreview: DatetimeCanvasPreview,
  },
  'analog-clock': {
    defaultProps: analogClockDefaultProps,
    defaultSize: analogClockDefaultSize,
    PropertyFields: AnalogClockPropertyFields,
    CanvasPreview: AnalogClockCanvasPreview,
  },
  'page-nav-button': {
    defaultProps: pageNavButtonDefaultProps,
    defaultSize: pageNavButtonDefaultSize,
    PropertyFields: PageNavButtonPropertyFields,
    CanvasPreview: PageNavButtonCanvasPreview,
  },
  table: {
    defaultProps: tableDefaultProps,
    defaultSize: tableDefaultSize,
    PropertyFields: TablePropertyFields,
    CanvasPreview: TableCanvasPreview,
  },
  'bar-chart': chartDef,
  'line-chart': chartDef,
  'pie-chart': chartDef,
  'card-list': {
    defaultProps: cardListDefaultProps,
    defaultSize: cardListDefaultSize,
    PropertyFields: CardListPropertyFields,
    CanvasPreview: CardListCanvasPreview,
    DataFields: CardListDataFields,
  },
  card: {
    defaultProps: cardDefaultProps,
    defaultSize: cardDefaultSize,
    PropertyFields: CardPropertyFields,
    CanvasPreview: CardCanvasPreview,
    DataFields: CardDataFields,
  },
  'key-value-tag': {
    defaultProps: keyValueTagDefaultProps,
    defaultSize: keyValueTagDefaultSize,
    PropertyFields: KeyValueTagPropertyFields,
    CanvasPreview: KeyValueTagCanvasPreview,
    DataFields: KeyValueTagDataFields,
  },
  map: {
    defaultProps: mapDefaultProps,
    defaultSize: mapDefaultSize,
    PropertyFields: MapPropertyFields,
    CanvasPreview: MapCanvasPreview,
  },
}

export function getEditorDef(type: ComponentType) {
  return editorRegistry[type]
}

export function getDefaultProps(type: ComponentType): Record<string, unknown> {
  return editorRegistry[type]?.defaultProps() ?? {}
}

export function getDefaultSize(type: ComponentType): { w: number; h: number } {
  return editorRegistry[type]?.defaultSize() ?? { w: 200, h: 150 }
}
