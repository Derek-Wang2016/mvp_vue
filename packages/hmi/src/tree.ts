import type { HmiNode, HmiNodeType } from './types'

export function nodeAt(cards: HmiNode[], path: number[]): HmiNode | undefined {
  let list = cards
  let node: HmiNode | undefined
  for (const index of path) {
    node = list[index]
    if (!node) return undefined
    list = node.children ?? []
  }
  return node
}

export function mapAt(cards: HmiNode[], path: number[], map: (node: HmiNode) => HmiNode): HmiNode[] {
  if (path.length === 0) return cards
  const [head, ...rest] = path
  return cards.map((node, index) => {
    if (index !== head) return node
    if (rest.length === 0) return map(node)
    return { ...node, children: mapAt(node.children ?? [], rest, map) }
  })
}

export function removeAt(cards: HmiNode[], path: number[]): HmiNode[] {
  if (path.length === 0) return cards
  const [head, ...rest] = path
  if (rest.length === 0) return cards.filter((_, index) => index !== head)
  return cards.map((node, index) => {
    if (index !== head) return node
    return { ...node, children: removeAt(node.children ?? [], rest) }
  })
}

export function insertChild(cards: HmiNode[], parentPath: number[], child: HmiNode): HmiNode[] {
  if (parentPath.length === 0) return [...cards, child]
  return mapAt(cards, parentPath, (node) => ({
    ...node,
    children: [...(node.children ?? []), child],
  }))
}

let seq = 1

export function createNode(type: HmiNodeType): HmiNode {
  const id = `${type}_${seq++}`
  const size = { w: 200, h: 48 }
  if (type === 'container') {
    return {
      type,
      id,
      pad: 8,
      radius: 0,
      bg_color: '#EBF7FC',
      border: { width: 0 },
      shadow: { width: 0 },
      size: { w: 320, h: 160 },
      layout: { flow: 'column', gap_row: 8, align_main: 'start', align_cross: 'start' },
      children: [],
    }
  }
  if (type === 'value') {
    return {
      type,
      prop: 'PATIENT_NAME',
      value_font: 'status',
      value_color: '#222222',
      layout: { flow: 'row', gap_col: 8, align_main: 'start', align_cross: 'center' },
      size,
    }
  }
  if (type === 'label') {
    return { type, title: '标题', title_font: 'default', title_color: '#333333', size: { w: 120, h: 32 } }
  }
  if (type === 'qrcode') {
    return { type, prop: 'QRCODE', bg_color: '#FFFFFF', radius: 4, pad: 4, size: { w: 120, h: 120 } }
  }
  if (type === 'split') {
    return {
      type,
      prop: 'SAFETAKECARE',
      split: ',',
      value_font: 'status',
      value_color: '#FFFFFF',
      item_h: 40,
      gap: 8,
      colors: {},
      default_color: '#7C7C7C',
      size: { w: 200, h: 160 },
    }
  }
  return { type: 'image', src: '', size: { w: 160, h: 120 } }
}
