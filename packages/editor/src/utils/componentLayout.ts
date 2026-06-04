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
