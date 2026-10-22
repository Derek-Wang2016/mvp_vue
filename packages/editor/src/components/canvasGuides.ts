import { useEditorStore } from '../stores/editorStore'

export type GuideAxis = 'x' | 'y'

export const guideLinesRef: { current: { axis: GuideAxis; pos: number }[] } = { current: [] }

type Box = { x: number; y: number; r: number; b: number }

function edgePairs(box: Box) {
  return {
    x: [box.x, (box.x + box.r) / 2, box.r],
    y: [box.y, (box.y + box.b) / 2, box.b],
  }
}

export type AlignHit = { axis: GuideAxis; pos: number; center: boolean }

/** 每个方向只留一条。中线和其他边同时对齐时，保留中线。 */
function pickOnePerAxis(lines: AlignHit[]): AlignHit[] {
  const pick = (axis: GuideAxis) => {
    const list = lines.filter((line) => line.axis === axis)
    return list.find((line) => line.center) ?? list[0] ?? null
  }
  return [pick('x'), pick('y')].filter((line): line is AlignHit => line != null)
}

/** 只比相同的边：左对左、右对右、上对上、下对下，以及各自的中线。 */
export function alignEdges(moving: Box[], others: Box[], threshold: number): AlignHit[] {
  const lines: AlignHit[] = []
  const seen = new Set<string>()
  for (const box of moving) {
    const self = edgePairs(box)
    for (const other of others) {
      const peer = edgePairs(other)
      for (let i = 0; i < 3; i++) {
        const center = i === 1
        if (Math.abs(self.x[i] - peer.x[i]) <= threshold) {
          const pos = peer.x[i]
          const key = `x:${Math.round(pos)}`
          if (!seen.has(key)) {
            seen.add(key)
            lines.push({ axis: 'x', pos, center })
          }
        }
        if (Math.abs(self.y[i] - peer.y[i]) <= threshold) {
          const pos = peer.y[i]
          const key = `y:${Math.round(pos)}`
          if (!seen.has(key)) {
            seen.add(key)
            lines.push({ axis: 'y', pos, center })
          }
        }
      }
    }
  }
  return pickOnePerAxis(lines)
}

/** 拖动过程中，与其它组件对齐的参考线 */
export function alignmentHits(threshold = 0.6): AlignHit[] {
  const store = useEditorStore()
  const drag = store.groupDragOffset
  if (!drag) return []
  const moving = store.components
    .filter((comp) => store.selectedIds.includes(comp.id))
    .map((comp) => ({
      x: comp.x + drag.dx,
      y: comp.y + drag.dy,
      r: comp.x + comp.w + drag.dx,
      b: comp.y + comp.h + drag.dy,
    }))
  const others = store.components
    .filter((comp) => !store.selectedIds.includes(comp.id))
    .map((comp) => ({ x: comp.x, y: comp.y, r: comp.x + comp.w, b: comp.y + comp.h }))
  return alignEdges(moving, others, threshold)
}

/** 拖动组件时，边或中线靠近参考线或其它组件则吸附 */
export function snapDragToGuides(rawDx: number, rawDy: number, scale: number) {
  const store = useEditorStore()
  const moving = store.components.filter((comp) => store.selectedIds.includes(comp.id))
  if (moving.length === 0) return { dx: rawDx, dy: rawDy }
  const boxes = moving.map((comp) => ({ x: comp.x, y: comp.y, r: comp.x + comp.w, b: comp.y + comp.h }))
  const threshold = 8 / (scale || 1)
  const others = store.components
    .filter((comp) => !store.selectedIds.includes(comp.id))
    .map((comp) => ({ x: comp.x, y: comp.y, r: comp.x + comp.w, b: comp.y + comp.h }))
  const rulerX = guideLinesRef.current.filter((line) => line.axis === 'x').map((line) => line.pos)
  const rulerY = guideLinesRef.current.filter((line) => line.axis === 'y').map((line) => line.pos)
  let bestDx = 0
  let bestDxAbs = threshold
  let bestDxCenter = false
  let bestDy = 0
  let bestDyAbs = threshold
  let bestDyCenter = false
  const consider = (raw: number, edge: number, target: number, axis: GuideAxis, center: boolean) => {
    const delta = target - (edge + raw)
    const abs = Math.abs(delta)
    if (abs >= threshold) return
    if (axis === 'x' && ((center && !bestDxCenter) || (abs < bestDxAbs && center === bestDxCenter))) {
      bestDxAbs = abs
      bestDx = delta
      bestDxCenter = center
    }
    if (axis === 'y' && ((center && !bestDyCenter) || (abs < bestDyAbs && center === bestDyCenter))) {
      bestDyAbs = abs
      bestDy = delta
      bestDyCenter = center
    }
  }
  for (const box of boxes) {
    const self = edgePairs(box)
    for (const line of rulerX) {
      consider(rawDx, self.x[0], line, 'x', false)
      consider(rawDx, self.x[1], line, 'x', true)
      consider(rawDx, self.x[2], line, 'x', false)
    }
    for (const line of rulerY) {
      consider(rawDy, self.y[0], line, 'y', false)
      consider(rawDy, self.y[1], line, 'y', true)
      consider(rawDy, self.y[2], line, 'y', false)
    }
    for (const other of others) {
      const peer = edgePairs(other)
      for (let i = 0; i < 3; i++) {
        consider(rawDx, self.x[i], peer.x[i], 'x', i === 1)
        consider(rawDy, self.y[i], peer.y[i], 'y', i === 1)
      }
    }
  }
  return { dx: rawDx + bestDx, dy: rawDy + bestDy }
}
