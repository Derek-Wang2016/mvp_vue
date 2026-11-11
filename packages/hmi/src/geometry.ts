import type { HmiCard, HmiDocument, HmiShape } from './types'

export interface ScreenBox {
  key: string
  kind: 'shape' | 'card'
  index: number
  x: number
  y: number
  w: number
  h: number
  line: boolean
  locked: boolean
}

export function shapeKey(index: number) {
  return `s:${index}`
}

export function cardKey(index: number) {
  return `c:${index}`
}

export function screenBoxes(doc: HmiDocument): ScreenBox[] {
  const shapes = doc.shapes.map((shape, index) => shapeBox(shape, index)).filter((box): box is ScreenBox => box != null)
  const cards = doc.cards.map((card, index) => cardBox(card, index))
  return [...shapes, ...cards]
}

function shapeBox(shape: HmiShape, index: number): ScreenBox | null {
  if (shape.type === 'line') {
    const x = Math.min(shape.x1, shape.x2)
    const y = Math.min(shape.y1, shape.y2)
    return {
      key: shapeKey(index),
      kind: 'shape',
      index,
      x,
      y,
      w: Math.max(1, Math.abs(shape.x2 - shape.x1)),
      h: Math.max(1, Math.abs(shape.y2 - shape.y1)),
      line: true,
      locked: !!shape.locked,
    }
  }
  return { key: shapeKey(index), kind: 'shape', index, x: shape.x, y: shape.y, w: shape.w, h: shape.h, line: false, locked: !!shape.locked }
}

function cardBox(card: HmiCard, index: number): ScreenBox {
  return { key: cardKey(index), kind: 'card', index, x: card.x, y: card.y, w: card.w, h: card.h, line: false, locked: !!card.locked }
}
