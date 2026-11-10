import { defineStore } from 'pinia'
import { createDefaultDocument } from '../defaultDocument'
import { createNode, insertChild, mapAt, nodeAt, removeAt } from '../tree'
import type { HmiDocument, HmiNode, HmiNodeType } from '../types'

export const useHmiStore = defineStore('hmi', {
  state: () => ({
    screenId: null as number | null,
    name: '床头卡 1024×600',
    doc: createDefaultDocument() as HmiDocument,
    selectedPath: [] as number[],
  }),
  getters: {
    selected(state): HmiNode | undefined {
      return nodeAt(state.doc.cards, state.selectedPath)
    },
  },
  actions: {
    load(id: number, name: string, doc: HmiDocument) {
      this.screenId = id
      this.name = name
      this.doc = normalize(doc)
      this.selectedPath = []
    },
    reset() {
      this.screenId = null
      this.name = '未命名屏'
      this.doc = createDefaultDocument()
      this.selectedPath = []
    },
    select(path: number[]) {
      this.selectedPath = path
    },
    patchNode(patch: Partial<HmiNode>) {
      if (this.selectedPath.length === 0) return
      this.doc.cards = mapAt(this.doc.cards, this.selectedPath, (node) => ({ ...node, ...patch }))
    },
    add(type: HmiNodeType) {
      const node = createNode(type)
      const selected = this.selected
      if (selected?.type === 'container' && this.selectedPath.length > 0) {
        this.doc.cards = insertChild(this.doc.cards, this.selectedPath, node)
        this.selectedPath = [...this.selectedPath, (selected.children?.length ?? 0)]
        return
      }
      if (this.selectedPath.length === 0) {
        this.doc.cards = [...this.doc.cards, node]
        this.selectedPath = [this.doc.cards.length - 1]
        return
      }
      const parent = this.selectedPath.slice(0, -1)
      const parentNode = parent.length ? nodeAt(this.doc.cards, parent) : undefined
      const list = parent.length ? (parentNode?.children ?? []) : this.doc.cards
      if (parent.length === 0) {
        this.doc.cards = [...this.doc.cards, node]
        this.selectedPath = [this.doc.cards.length - 1]
      } else {
        this.doc.cards = insertChild(this.doc.cards, parent, node)
        this.selectedPath = [...parent, list.length]
      }
    },
    removeSelected() {
      if (this.selectedPath.length === 0) return
      const path = this.selectedPath
      this.doc.cards = removeAt(this.doc.cards, path)
      this.selectedPath = path.slice(0, -1)
    },
    setScreenSize(w: number, h: number) {
      this.doc.screen = { w, h }
      const root = this.doc.cards[0]
      if (root?.type === 'container') {
        this.doc.cards = mapAt(this.doc.cards, [0], (node) => ({
          ...node,
          size: { ...(node.size ?? {}), w, h },
        }))
      }
    },
  },
})

function normalize(doc: HmiDocument): HmiDocument {
  const base = createDefaultDocument()
  return {
    version: 1,
    screen: doc.screen ?? base.screen,
    fonts: doc.fonts ?? base.fonts,
    colors: doc.colors ?? {},
    abbrs: doc.abbrs ?? {},
    sample: doc.sample ?? {},
    cards: doc.cards ?? [],
  }
}
