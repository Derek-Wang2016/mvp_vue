/** 与 ResizeHandles / editorStore 一致 */
export const MIN_COMPONENT_W = 30
export const MIN_COMPONENT_H = 20

export interface ComponentLayoutRect {
  x: number
  y: number
  w: number
  h: number
}

export function clampComponentLayout(
  layout: Partial<ComponentLayoutRect> & { x: number; y: number; w: number; h: number },
  pageWidth: number,
  pageHeight: number,
): ComponentLayoutRect {
  let x = Math.max(0, Math.round(layout.x))
  let y = Math.max(0, Math.round(layout.y))
  let w = Math.max(MIN_COMPONENT_W, Math.round(layout.w))
  let h = Math.max(MIN_COMPONENT_H, Math.round(layout.h))

  if (x + w > pageWidth) w = Math.max(MIN_COMPONENT_W, pageWidth - x)
  if (y + h > pageHeight) h = Math.max(MIN_COMPONENT_H, pageHeight - y)
  if (w > pageWidth) {
    w = Math.max(MIN_COMPONENT_W, pageWidth)
    x = 0
  }
  if (h > pageHeight) {
    h = Math.max(MIN_COMPONENT_H, pageHeight)
    y = 0
  }

  return { x, y, w, h }
}

export type ResizeDir = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se'

/** Shift 等比缩放：固定对角/对边，保持初始宽高比 */
export function calcRectProportional(
  orig: ComponentLayoutRect,
  dir: ResizeDir,
  dx: number,
  dy: number,
): ComponentLayoutRect {
  const ratio = orig.w / orig.h

  let newW = orig.w
  let newH = orig.h

  if (dir.includes('e')) newW = orig.w + dx
  if (dir.includes('w')) newW = orig.w - dx
  if (dir.includes('s')) newH = orig.h + dy
  if (dir.includes('n')) newH = orig.h - dy

  if (dir.length === 2) {
    const scaleW = newW / orig.w
    const scaleH = newH / orig.h
    if (Math.abs(scaleW - 1) >= Math.abs(scaleH - 1)) {
      newH = newW / ratio
    } else {
      newW = newH * ratio
    }
  } else if (dir === 'e' || dir === 'w') {
    newH = newW / ratio
  } else {
    newW = newH * ratio
  }

  if (newW < MIN_COMPONENT_W) {
    newW = MIN_COMPONENT_W
    newH = newW / ratio
  }
  if (newH < MIN_COMPONENT_H) {
    newH = MIN_COMPONENT_H
    newW = newH * ratio
  }
  newW = Math.max(MIN_COMPONENT_W, newW)
  newH = Math.max(MIN_COMPONENT_H, newH)

  let x = orig.x
  let y = orig.y
  if (dir.includes('w')) x = orig.x + orig.w - newW
  if (dir.includes('n')) y = orig.y + orig.h - newH

  return { x, y, w: newW, h: newH }
}
