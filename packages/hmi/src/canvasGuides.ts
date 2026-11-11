export type GuideAxis = 'x' | 'y'
export type AlignHit = { axis: GuideAxis; pos: number; center: boolean }
export type Box = { x: number; y: number; r: number; b: number }

export const guideLinesRef: { current: { axis: GuideAxis; pos: number }[] } = { current: [] }

function edgePairs(box: Box) {
  return {
    x: [box.x, (box.x + box.r) / 2, box.r] as const,
    y: [box.y, (box.y + box.b) / 2, box.b] as const,
  }
}

function at(values: readonly number[], index: number) {
  return values[index] ?? 0
}

function pickOnePerAxis(lines: AlignHit[]): AlignHit[] {
  const pick = (axis: GuideAxis) => {
    const list = lines.filter((line) => line.axis === axis)
    return list.find((line) => line.center) ?? list[0] ?? null
  }
  return [pick('x'), pick('y')].filter((line): line is AlignHit => line != null)
}

export function alignEdges(moving: Box[], others: Box[], threshold: number): AlignHit[] {
  const lines: AlignHit[] = []
  const seen = new Set<string>()
  for (const box of moving) {
    const self = edgePairs(box)
    for (const other of others) {
      const peer = edgePairs(other)
      for (let i = 0; i < 3; i++) {
        const center = i === 1
        if (Math.abs(at(self.x, i) - at(peer.x, i)) <= threshold) {
          const pos = at(peer.x, i)
          const key = `x:${Math.round(pos)}`
          if (!seen.has(key)) {
            seen.add(key)
            lines.push({ axis: 'x', pos, center })
          }
        }
        if (Math.abs(at(self.y, i) - at(peer.y, i)) <= threshold) {
          const pos = at(peer.y, i)
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

/** 边或中线靠近标尺参考线或其它对象时吸附。 */
export function snapDrag(rawDx: number, rawDy: number, scale: number, moving: Box[], others: Box[]) {
  if (moving.length === 0) return { dx: rawDx, dy: rawDy }
  const threshold = 8 / (scale || 1)
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
  for (const box of moving) {
    const self = edgePairs(box)
    for (const line of rulerX) {
      consider(rawDx, at(self.x, 0), line, 'x', false)
      consider(rawDx, at(self.x, 1), line, 'x', true)
      consider(rawDx, at(self.x, 2), line, 'x', false)
    }
    for (const line of rulerY) {
      consider(rawDy, at(self.y, 0), line, 'y', false)
      consider(rawDy, at(self.y, 1), line, 'y', true)
      consider(rawDy, at(self.y, 2), line, 'y', false)
    }
    for (const other of others) {
      const peer = edgePairs(other)
      for (let i = 0; i < 3; i++) {
        consider(rawDx, at(self.x, i), at(peer.x, i), 'x', i === 1)
        consider(rawDy, at(self.y, i), at(peer.y, i), 'y', i === 1)
      }
    }
  }
  return { dx: rawDx + bestDx, dy: rawDy + bestDy }
}
