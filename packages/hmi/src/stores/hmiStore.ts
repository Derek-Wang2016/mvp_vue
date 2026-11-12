import { defineStore } from 'pinia'
import { createBlankDocument, createDefaultDocument } from '../defaultDocument'
import { bindingCount } from '../resolve'
import { cardKey, clampTranslation, screenBoxes, shapeKey } from '../geometry'
import { currentPage, LIMITS, type HmiCard, type HmiDocument, type HmiItem, type HmiPage, type HmiShape, type Selection } from '../types'

export const useHmiStore = defineStore('hmi', {
  state: () => ({
    screenId: null as number | null,
    name: '床头卡 1024×600',
    doc: createDefaultDocument() as HmiDocument,
    selection: null as Selection | null,
    selectedKeys: [] as string[],
    dragOffset: null as { dx: number; dy: number } | null,
    clipboard: null as { shapes: HmiShape[]; cards: HmiCard[]; items: HmiItem[] } | null,
  }),
  getters: {
    canCopy(state): boolean {
      return state.selectedKeys.length > 0 || state.selection?.kind === 'item'
    },
    canPaste(state): boolean {
      const clip = state.clipboard
      return !!clip && (clip.shapes.length + clip.cards.length + clip.items.length) > 0
    },
    page(state): HmiPage {
      return currentPage(state.doc)
    },
    pageNames(state): string[] {
      return ['index', ...Object.keys(state.doc.pages).filter((name) => name !== 'index')]
    },
  },
  actions: {
    migrate() {
      this.doc = normalize(this.doc)
    },
    load(id: number, name: string, raw: HmiDocument) {
      this.screenId = id
      this.name = name
      this.doc = normalize(raw)
      this.selection = null
      this.selectedKeys = []
    },
    reset() {
      this.screenId = null
      this.name = '未命名屏'
      this.doc = createBlankDocument()
      this.selection = null
      this.selectedKeys = []
      this.clipboard = null
    },
    select(selection: Selection | null) {
      this.selection = selection
      if (!selection) this.selectedKeys = []
      else if (selection.kind === 'shape') this.selectedKeys = [shapeKey(selection.index)]
      else this.selectedKeys = [cardKey(selection.kind === 'item' ? selection.card : selection.index)]
    },
    selectKey(key: string, additive: boolean) {
      if (additive) {
        this.selectedKeys = this.selectedKeys.includes(key)
          ? this.selectedKeys.filter((item) => item !== key)
          : [...this.selectedKeys, key]
      } else if (!this.selectedKeys.includes(key)) {
        this.selectedKeys = [key]
      }
      const last = this.selectedKeys[this.selectedKeys.length - 1]
      this.selection = last ? selectionFromKey(last) : null
    },
    selectKeys(keys: string[]) {
      this.selectedKeys = keys
      const last = keys[keys.length - 1]
      this.selection = last ? selectionFromKey(last) : null
    },
    setColors(colors: Record<string, string>) {
      this.doc.colors = colors
    },
    setIcons(icons: Record<string, string>) {
      this.doc.icons = icons
    },
    setLibrary(library: Record<string, string>) {
      this.doc.library = library
    },
    showPage(name: string) {
      if (!this.doc.pages[name]) return
      this.doc.active = name
      this.clearSelection()
    },
    addPage(name: string): string | null {
      const pageName = name.trim()
      if (!pageName) return '请填写页面名称'
      if (this.doc.pages[pageName]) return '页面名称已存在'
      this.doc.pages = {
        ...this.doc.pages,
        [pageName]: { shapes: [], cards: [] },
      }
      this.showPage(pageName)
      return null
    },
    removePage(name: string) {
      if (name === 'index' || !this.doc.pages[name]) return
      delete this.doc.pages[name]
      if (this.doc.active === name) this.showPage('index')
    },
    clearSelection() {
      this.selection = null
      this.selectedKeys = []
    },
    addShape(type: HmiShape['type']): string | null {
      if (type === 'line' && this.page.shapes.filter((shape) => shape.type === 'line').length >= LIMITS.lines) {
        return `线条最多 ${LIMITS.lines} 条`
      }
      const { w, h } = this.doc.screen
      if (type === 'line') {
        this.page.shapes.push({ type, x1: 40, y1: 80, x2: Math.min(w, 400), y2: 80, width: 1, color: '#7EC8E3' })
      } else if (type === 'image') {
        this.page.shapes.push({ type, x: 40, y: 80, w: 64, h: 64, src: 'assets/logo.png' })
      } else if (type === 'icon') {
        this.page.shapes.push({ type, x: 40, y: 80, w: 40, h: 40, prop: 'TEND_NAME' })
      } else if (type === 'block') {
        this.page.shapes.push({
          type, x: 40, y: 80, w: 320, h: 180,
          bg: '#EBF7FC', color: '#222222', font: 'default',
          radius: 8, border_w: 1, border_color: '#7EC8E3',
          key: '', params: '{}',
        })
      } else if (type === 'button') {
        this.page.shapes.push({
          type, x: 40, y: 80, w: 160, h: 56,
          text: '按钮', color: '#FFFFFF', font: 'default', icon_pos: 'left',
          bg: '#0E3A5F', radius: 8,
          action: 'page', page: 'index',
        })
      } else {
        this.page.shapes.push({ type, x: 40, y: 80, w: 200, h: 80, bg: type === 'circle' ? '#EBF7FC' : '#0E3A5F', radius: 0 })
      }
      this.selection = { kind: 'shape', index: this.page.shapes.length - 1 }
      this.selectedKeys = [shapeKey(this.page.shapes.length - 1)]
      return null
    },
    addCard(): string | null {
      const card: HmiCard = {
        x: 40, y: 80, w: 240, h: 120,
        bg: '#EBF7FC', radius: 10,
        cols: 1, rows: 1, gap: 0,
        items: [],
      }
      this.page.cards.push(card)
      this.selection = { kind: 'card', index: this.page.cards.length - 1 }
      this.selectedKeys = [cardKey(this.page.cards.length - 1)]
      return null
    },
    addItem(type: HmiItem['type']): string | null {
      const cardIndex = this.selection?.kind === 'item' ? this.selection.card : this.selection?.kind === 'card' ? this.selection.index : -1
      if (cardIndex < 0) return '先选中一张卡片'
      const card = this.page.cards[cardIndex]
      if (!card) return '先选中一张卡片'
      if (type !== 'label' && bindingCount(this.doc) >= LIMITS.bindings) return `绑定字段最多 ${LIMITS.bindings} 个`
      const item: HmiItem = type === 'label'
        ? { type, text: '标题', font: 'default', color: '#333333', align: 'center' }
        : type === 'qrcode'
          ? { type, prop: 'QRCODE', size: 140, align: 'center' }
          : type === 'split'
            ? { type, prop: 'SAFETAKECARE', split: ',', font: '33', color: '#FFFFFF', item_h: 73, gap: 8, default_color: '#7C7C7C' }
            : { type, prop: 'PATIENT_NAME', font: 'status', color: '#222222', align: 'center' }
      card.items.push(item)
      this.selection = { kind: 'item', card: cardIndex, index: card.items.length - 1 }
      return null
    },
    removeSelected() {
      const sel = this.selection
      if (sel?.kind === 'item' && this.selectedKeys.length <= 1) {
        this.page.cards[sel.card]?.items.splice(sel.index, 1)
        this.selection = null
        this.selectedKeys = []
        return
      }
      const keys = new Set(this.selectedKeys)
      const shapeIndexes = this.page.shapes.map((_, index) => index).filter((index) => keys.has(shapeKey(index)))
      const cardIndexes = this.page.cards.map((_, index) => index).filter((index) => keys.has(cardKey(index)))
      for (const index of shapeIndexes.sort((a, b) => b - a)) this.page.shapes.splice(index, 1)
      for (const index of cardIndexes.sort((a, b) => b - a)) this.page.cards.splice(index, 1)
      this.selection = null
      this.selectedKeys = []
    },
    copySelected() {
      const keys = new Set(this.selectedKeys)
      const sel = this.selection
      if (sel?.kind === 'item' && keys.size <= 1) {
        const item = this.page.cards[sel.card]?.items[sel.index]
        if (!item) return
        this.clipboard = { shapes: [], cards: [], items: [clone(item)] }
        return
      }
      const shapes = this.page.shapes.filter((_, index) => keys.has(shapeKey(index))).map((shape) => clone(shape))
      const cards = this.page.cards.filter((_, index) => keys.has(cardKey(index))).map((card) => clone(card))
      if (shapes.length + cards.length === 0) return
      this.clipboard = { shapes, cards, items: [] }
    },
    cutSelected() {
      this.copySelected()
      this.removeSelected()
    },
    paste() {
      const clip = this.clipboard
      if (!clip) return
      const keys: string[] = []
      if (clip.items.length) {
        const cardIndex = this.selection?.kind === 'item'
          ? this.selection.card
          : this.selection?.kind === 'card'
            ? this.selection.index
            : this.page.cards.length - 1
        const card = this.page.cards[cardIndex]
        if (!card) return
        for (const item of clip.items) {
          if (item.type !== 'label' && bindingCount(this.doc) >= LIMITS.bindings) break
          if (item.prop === 'CLOCK' && this.page.cards.some((entry) => entry.items.some((cell) => cell.prop === 'CLOCK'))) continue
          card.items.push(clone(item))
          this.selection = { kind: 'item', card: cardIndex, index: card.items.length - 1 }
        }
        this.selectedKeys = [cardKey(cardIndex)]
        return
      }
      for (const shape of clip.shapes) {
        const next = offsetShape(clone({ ...shape, locked: false }))
        if (next.type === 'line' && this.page.shapes.filter((item) => item.type === 'line').length >= LIMITS.lines) continue
        this.page.shapes.push(next)
        keys.push(shapeKey(this.page.shapes.length - 1))
      }
      for (const card of clip.cards) {
        this.page.cards.push(offsetCard(clone({ ...card, locked: false })))
        keys.push(cardKey(this.page.cards.length - 1))
      }
      if (keys.length) this.selectKeys(keys)
      this.clipboard = {
        shapes: clip.shapes.map((shape) => offsetShape(clone(shape))),
        cards: clip.cards.map((card) => offsetCard(clone(card))),
        items: clip.items.map((item) => clone(item)),
      }
    },
    moveSelected(dx: number, dy: number) {
      const keys = new Set(this.selectedKeys)
      const moving = screenBoxes(this.doc).filter((box) => keys.has(box.key) && !box.locked)
      const limited = clampTranslation(moving, dx, dy, this.doc.screen.w, this.doc.screen.h)
      const ix = Math.round(limited.dx)
      const iy = Math.round(limited.dy)
      this.page.shapes.forEach((shape, index) => {
        if (!keys.has(shapeKey(index)) || shape.locked) return
        if (shape.type === 'line') {
          shape.x1 += ix
          shape.y1 += iy
          shape.x2 += ix
          shape.y2 += iy
        } else {
          shape.x += ix
          shape.y += iy
        }
      })
      this.page.cards.forEach((card, index) => {
        if (!keys.has(cardKey(index)) || card.locked) return
        card.x += ix
        card.y += iy
      })
    },
    setBoxRect(key: string, rect: { x: number; y: number; w: number; h: number }) {
      const sel = selectionFromKey(key)
      if (!sel) return
      if (sel.kind === 'card') {
        const card = this.page.cards[sel.index]
        if (!card || card.locked) return
        Object.assign(card, rect)
        return
      }
      const shape = this.page.shapes[sel.index]
      if (shape && shape.type !== 'line' && !shape.locked) Object.assign(shape, rect)
    },
    align(mode: 'left' | 'right' | 'top' | 'bottom' | 'centerX' | 'centerY' | 'equalW' | 'equalH') {
      const boxes = screenBoxes(this.doc).filter((box) => this.selectedKeys.includes(box.key))
      if (boxes.length < 2) return
      const anchor = boxes[0]
      if (!anchor) return
      if (mode === 'equalW' || mode === 'equalH') {
        for (const box of boxes) {
          if (box.line || box.locked || box.key === anchor.key) continue
          this.setBoxRect(box.key, {
            x: box.x,
            y: box.y,
            w: mode === 'equalW' ? anchor.w : box.w,
            h: mode === 'equalH' ? anchor.h : box.h,
          })
        }
        return
      }
      const minX = Math.min(...boxes.map((box) => box.x))
      const minY = Math.min(...boxes.map((box) => box.y))
      const maxR = Math.max(...boxes.map((box) => box.x + box.w))
      const maxB = Math.max(...boxes.map((box) => box.y + box.h))
      const midX = anchor.x + anchor.w / 2
      const midY = anchor.y + anchor.h / 2
      for (const box of boxes) {
        let x = box.x
        let y = box.y
        if (mode === 'left') x = minX
        if (mode === 'right') x = maxR - box.w
        if (mode === 'top') y = minY
        if (mode === 'bottom') y = maxB - box.h
        if (mode === 'centerX') x = Math.round(midX - box.w / 2)
        if (mode === 'centerY') y = Math.round(midY - box.h / 2)
        if (box.locked) continue
        if (box.line) this.moveShape(box.index, x - box.x, y - box.y)
        else this.setBoxRect(box.key, { x: Math.round(x), y: Math.round(y), w: box.w, h: box.h })
      }
    },
    distribute(axis: 'x' | 'y') {
      const boxes = screenBoxes(this.doc).filter((box) => this.selectedKeys.includes(box.key) && !box.locked)
      if (boxes.length < 2) return
      const sorted = [...boxes].sort((a, b) => axis === 'x' ? a.x - b.x : a.y - b.y)
      const start = axis === 'x' ? Math.min(...boxes.map((box) => box.x)) : Math.min(...boxes.map((box) => box.y))
      const end = axis === 'x'
        ? Math.max(...boxes.map((box) => box.x + box.w))
        : Math.max(...boxes.map((box) => box.y + box.h))
      const total = sorted.reduce((sum, box) => sum + (axis === 'x' ? box.w : box.h), 0)
      const gap = (end - start - total) / (sorted.length - 1)
      if (!Number.isFinite(gap)) return
      const step = Math.max(0, gap)
      let cursor = start
      for (const box of sorted) {
        const x = axis === 'x' ? Math.round(cursor) : box.x
        const y = axis === 'y' ? Math.round(cursor) : box.y
        if (box.line) this.moveShape(box.index, x - box.x, y - box.y)
        else this.setBoxRect(box.key, { x, y, w: box.w, h: box.h })
        cursor += (axis === 'x' ? box.w : box.h) + step
      }
    },
    toggleLock(key: string) {
      const sel = selectionFromKey(key)
      if (!sel || sel.kind === 'item') return
      if (sel.kind === 'shape') {
        const shape = this.page.shapes[sel.index]
        if (shape) shape.locked = !shape.locked
      } else {
        const card = this.page.cards[sel.index]
        if (card) card.locked = !card.locked
      }
    },
    bring(key: string, dir: -1 | 1) {
      const sel = selectionFromKey(key)
      if (!sel || sel.kind === 'item') return
      if (sel.kind === 'shape') {
        this.swapShape(sel.index, dir)
        const next = sel.index + dir
        if (next >= 0 && next < this.page.shapes.length) this.select({ kind: 'shape', index: next })
      } else {
        this.swapCard(sel.index, dir)
      }
    },
    patchShape(index: number, patch: Partial<HmiShape>) {
      const shape = this.page.shapes[index]
      if (!shape) return
      Object.assign(shape as object, patch)
    },
    patchCard(index: number, patch: Partial<HmiCard>) {
      const card = this.page.cards[index]
      if (!card) return
      if ((patch.cols ?? card.cols ?? 1) > LIMITS.tracks || (patch.rows ?? card.rows ?? 1) > LIMITS.tracks) return
      Object.assign(card, patch)
    },
    patchItem(cardIndex: number, index: number, patch: Partial<HmiItem>) {
      const item = this.page.cards[cardIndex]?.items[index]
      if (!item) return
      if (patch.prop === 'CLOCK' && item.prop !== 'CLOCK' && clockCount(this.doc) >= 1) return
      Object.assign(item, patch)
    },
    moveShape(index: number, dx: number, dy: number) {
      const shape = this.page.shapes[index]
      if (!shape) return
      if (shape.type === 'line') {
        shape.x1 = Math.round(shape.x1 + dx)
        shape.y1 = Math.round(shape.y1 + dy)
        shape.x2 = Math.round(shape.x2 + dx)
        shape.y2 = Math.round(shape.y2 + dy)
      } else {
        shape.x = Math.round(shape.x + dx)
        shape.y = Math.round(shape.y + dy)
      }
    },
    moveCard(index: number, dx: number, dy: number) {
      const card = this.page.cards[index]
      if (!card) return
      card.x = Math.round(card.x + dx)
      card.y = Math.round(card.y + dy)
    },
    swapShape(index: number, dir: -1 | 1) {
      swap(this.page.shapes, index, dir)
    },
    swapCard(index: number, dir: -1 | 1) {
      swap(this.page.cards, index, dir)
      if (this.selection?.kind === 'card' && this.selection.index === index) this.selection = { kind: 'card', index: index + dir }
    },
  },
})

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function offsetShape(shape: HmiShape): HmiShape {
  if (shape.type === 'line') {
    shape.x1 += 16
    shape.y1 += 16
    shape.x2 += 16
    shape.y2 += 16
  } else {
    shape.x += 16
    shape.y += 16
  }
  return shape
}

function offsetCard(card: HmiCard): HmiCard {
  card.x += 16
  card.y += 16
  return card
}

function clockCount(doc: HmiDocument) {
  return currentPage(doc).cards.reduce((sum, card) => sum + card.items.filter((item) => item.prop === 'CLOCK').length, 0)
}

function swap<T>(list: T[], index: number, dir: -1 | 1) {
  const next = index + dir
  const a = list[index]
  const b = list[next]
  if (a == null || b == null) return
  list[index] = b
  list[next] = a
}

function selectionFromKey(key: string): Selection | null {
  const [kind, raw] = key.split(':')
  const index = Number(raw)
  if (!Number.isInteger(index)) return null
  if (kind === 's') return { kind: 'shape', index }
  if (kind === 'c') return { kind: 'card', index }
  return null
}

function asPage(value: unknown): HmiPage | null {
  if (!value || typeof value !== 'object') return null
  const page = value as HmiPage
  if (!Array.isArray(page.shapes) || !Array.isArray(page.cards)) return null
  return {
    shapes: page.shapes,
    cards: page.cards.map((card) => ({ ...card, items: card.items ?? [] })),
  }
}

function normalize(raw: Partial<HmiDocument> & { shapes?: HmiShape[]; cards?: HmiCard[] } | null | undefined): HmiDocument {
  const base = createDefaultDocument()
  if (!raw) return base
  const pages: Record<string, HmiPage> = {}
  if (raw.pages && typeof raw.pages === 'object') {
    for (const [name, page] of Object.entries(raw.pages)) {
      const next = asPage(page)
      if (next) pages[name] = next
    }
  }
  if (!pages.index && Array.isArray(raw.shapes) && Array.isArray(raw.cards)) {
    pages.index = {
      shapes: raw.shapes,
      cards: raw.cards.map((card) => ({ ...card, items: card.items ?? [] })),
    }
  }
  if (!pages.index) return base
  const active = raw.active && pages[raw.active] ? raw.active : 'index'
  return {
    version: 3,
    screen: raw.screen ?? base.screen,
    sample: { ...base.sample, ...(raw.sample ?? {}) },
    colors: raw.colors ?? {},
    icons: raw.icons ?? {},
    library: raw.library ?? {},
    active,
    pages,
  }
}
