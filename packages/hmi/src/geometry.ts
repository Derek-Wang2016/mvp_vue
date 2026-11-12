import { currentPage, type HmiCard, type HmiDocument, type HmiShape } from './types'

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

/** 整组一起移动时，外框不能超出屏幕。比屏幕更大时钉在左上角。 */
export function clampTranslation(
  boxes: { x: number; y: number; w: number; h: number }[],
  dx: number,
  dy: number,
  width: number,
  height: number,
) {
  if (boxes.length === 0) return { dx, dy }
  let minX = Infinity
  let minY = Infinity
  let maxR = -Infinity
  let maxB = -Infinity
  for (const box of boxes) {
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxR = Math.max(maxR, box.x + box.w)
    maxB = Math.max(maxB, box.y + box.h)
  }
  if (maxR + dx > width) dx = width - maxR
  if (minX + dx < 0) dx = -minX
  if (maxB + dy > height) dy = height - maxB
  if (minY + dy < 0) dy = -minY
  return { dx, dy }
}

export function screenBoxes(doc: HmiDocument): ScreenBox[] {
  const page = currentPage(doc)
  const shapes = page.shapes.map((shape, index) => shapeBox(shape, index)).filter((box): box is ScreenBox => box != null)
  const cards = page.cards.map((card, index) => cardBox(card, index))
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
