import { defineStore } from 'pinia'
import { shallowRef, ref, computed, triggerRef } from 'vue'
import type {
  PageComponent, ComponentType, PageSchema, DataSource, ColorDictEntry,
  IconDictEntry, AbbrevDictEntry, BgGradient, CustomIconRecord,
} from '@mvp-vue/schema'
import {
  DEFAULT_PAGE_WIDTH, DEFAULT_PAGE_HEIGHT,
  DEFAULT_GRADIENT_COLOR_TO,
  buildSavedIconsSnapshot, collectReferencedSavedIconIds, collectSavedIconsFromSchema,
  mergeSavedIconIntoPool, isComponentLocked,
} from '@mvp-vue/schema'
import { clampPageSize } from '../pageSizePresets'
import { clampComponentLayout } from '../utils/componentLayout'
import { getDefaultProps, getDefaultSize } from '../components/registry/registry'
import { isCurrentPageReadOnly, type PageScope } from '../pagePolicy'

const MAX_HISTORY = 50
const PASTE_OFFSET = 20
const MIN_COMPONENT_W = 30
const MIN_COMPONENT_H = 20

function clonePageComponent(c: PageComponent): PageComponent {
  try {
    return structuredClone(c)
  } catch {
    return JSON.parse(JSON.stringify(c)) as PageComponent
  }
}

function cloneComponentsList(list: PageComponent[]): PageComponent[] {
  try {
    return structuredClone(list)
  } catch {
    return JSON.parse(JSON.stringify(list)) as PageComponent[]
  }
}

function cloneComponentsByIds(components: PageComponent[], ids: string[]): PageComponent[] {
  const byId = new Map(components.map((c) => [c.id, c]))
  return ids
    .map((id) => byId.get(id))
    .filter((c): c is PageComponent => c != null)
    .map((c) => clonePageComponent(c))
}

interface Snapshot {
  components: PageComponent[]
  nextId: number
}

export type AlignMode = 'left' | 'right' | 'top' | 'bottom'

let nextId = 1
let nextColorDictId = 1
let nextIconDictId = 1
let nextAbbrevDictId = 1

export const useEditorStore = defineStore('editor', () => {
  // === state ===
  const components = shallowRef<PageComponent[]>([])
  const selectedIds = ref<string[]>([])
  /** 多选时首个点选的组件 id（Shift 追加不改变；框选取 ids[0]） */
  const anchorComponentId = ref<string | null>(null)
  const pageId = ref<number | null>(null)
  const pageScope = ref<PageScope>('draft')
  const pageName = ref('未命名大屏')
  const pageWidth = ref(DEFAULT_PAGE_WIDTH)
  const pageHeight = ref(DEFAULT_PAGE_HEIGHT)

  // === zoom ===
  const ZOOM_MIN = 25
  const ZOOM_MAX = 200
  const ZOOM_STEP = 10
  const userZoom = ref(100)
  const hasUserZoomed = ref(false)
  const fitRequestCount = ref(0)
  const canvasScale = computed(() => userZoom.value / 100)

  const bgColor = ref('#0d1520')
  const bgColorTo = ref(DEFAULT_GRADIENT_COLOR_TO)
  const bgGradient = ref<BgGradient>('none')
  const bgImage = ref('')
  const bgOpacity = ref(1)
  const dataSources = ref<DataSource[]>([])
  const colorDict = ref<ColorDictEntry[]>([])
  const iconDict = ref<IconDictEntry[]>([])
  const savedIcons = ref<CustomIconRecord[]>([])
  const abbrevDict = ref<AbbrevDictEntry[]>([])

  const past = ref<Snapshot[]>([])
  const future = ref<Snapshot[]>([])
  const groupDragOffset = ref<{ dx: number; dy: number } | null>(null)
  const clipboard = ref<PageComponent[] | null>(null)

  // === computed ===
  const pageReadOnly = computed(() => isCurrentPageReadOnly(pageScope.value))

  const firstSelectedId = computed(() => selectedIds.value[0] ?? null)
  const canUndo = computed(() => !pageReadOnly.value && past.value.length > 0)
  const canRedo = computed(() => !pageReadOnly.value && future.value.length > 0)
  const canCopy = computed(() => selectedIds.value.length > 0)
  const canPaste = computed(() =>
    !pageReadOnly.value && !!(clipboard.value && clipboard.value.length > 0),
  )
  const canMoveUp = computed(() => {
    if (pageReadOnly.value) return false
    const id = firstSelectedId.value
    if (!id) return false
    const comp = components.value.find((c) => c.id === id)
    if (!comp || isComponentLocked(comp)) return false
    const idx = components.value.findIndex((c) => c.id === id)
    return idx >= 0 && idx < components.value.length - 1
  })
  const canMoveDown = computed(() => {
    if (pageReadOnly.value) return false
    const id = firstSelectedId.value
    if (!id) return false
    const comp = components.value.find((c) => c.id === id)
    if (!comp || isComponentLocked(comp)) return false
    const idx = components.value.findIndex((c) => c.id === id)
    return idx > 0
  })
  const canAlign = computed(() => {
    if (pageReadOnly.value) return false
    if (selectedIds.value.length < 2) return false
    const ids = selectedIds.value
    if (!hasLockedInSelection(ids)) return true
    const refId = anchorComponentId.value ?? ids[0]!
    return filterUnlockedIds(ids.filter((id) => id !== refId)).length > 0
  })
  const canCut = computed(() => {
    if (pageReadOnly.value) return false
    if (selectedIds.value.length === 0) return false
    return selectedIds.value.some((id) => {
      const c = components.value.find((x) => x.id === id)
      return c && !isComponentLocked(c)
    })
  })
  const canDelete = computed(() => canCut.value)

  // === helpers ===
  /** 避免 HMR 后模块级 nextId 重置导致粘贴出重复 id（Vue v-for 重复 key 不渲染新节点） */
  function ensureNextComponentId() {
    let maxNum = 0
    for (const c of components.value) {
      const m = c.id.match(/^comp-(\d+)$/)
      if (m) maxNum = Math.max(maxNum, Number(m[1]))
    }
    if (nextId <= maxNum) nextId = maxNum + 1
  }

  function pushHistory() {
    if (pageReadOnly.value) return
    past.value = [...past.value, { components: cloneComponentsList(components.value), nextId }].slice(-MAX_HISTORY)
    future.value = []
  }

  function getComponentById(id: string): PageComponent | undefined {
    return components.value.find((c) => c.id === id)
  }

  function hasLockedInSelection(ids: string[] = selectedIds.value): boolean {
    return ids.some((id) => {
      const c = getComponentById(id)
      return c != null && isComponentLocked(c)
    })
  }

  function filterUnlockedIds(ids: string[]): string[] {
    return ids.filter((id) => {
      const c = getComponentById(id)
      return c != null && !isComponentLocked(c)
    })
  }

  function setComponentLocked(id: string, locked: boolean) {
    const comp = getComponentById(id)
    if (!comp || !!comp.locked === locked) return
    pushHistory()
    components.value = components.value.map((c) =>
      c.id === id ? { ...c, locked: locked || undefined } : c,
    )
    if (locked) {
      selectedIds.value = selectedIds.value.filter((x) => x !== id)
      if (anchorComponentId.value === id) {
        anchorComponentId.value = selectedIds.value[0] ?? null
      }
    }
  }

  function setComponentsLocked(ids: string[], locked: boolean) {
    const idSet = new Set(ids)
    const hasChange = components.value.some((c) => idSet.has(c.id) && !!c.locked !== locked)
    if (!hasChange) return
    pushHistory()
    components.value = components.value.map((c) =>
      idSet.has(c.id) ? { ...c, locked: locked || undefined } : c,
    )
    if (locked) {
      selectedIds.value = selectedIds.value.filter((x) => !idSet.has(x))
      if (anchorComponentId.value && idSet.has(anchorComponentId.value)) {
        anchorComponentId.value = selectedIds.value[0] ?? null
      }
    }
  }

  // === actions ===
  function undo() {
    if (pageReadOnly.value || past.value.length === 0) return
    const prev = past.value[past.value.length - 1]!
    future.value = [...future.value, { components: cloneComponentsList(components.value), nextId }]
    past.value = past.value.slice(0, -1)
    components.value = cloneComponentsList(prev.components)
    selectedIds.value = []
    anchorComponentId.value = null
    nextId = prev.nextId
  }

  function redo() {
    if (pageReadOnly.value || future.value.length === 0) return
    const nxt = future.value[future.value.length - 1]!
    past.value = [...past.value, { components: cloneComponentsList(components.value), nextId }]
    future.value = future.value.slice(0, -1)
    components.value = cloneComponentsList(nxt.components)
    selectedIds.value = []
    anchorComponentId.value = null
    nextId = nxt.nextId
  }

  function selectComponent(id: string | null, multi = false) {
    if (!id) {
      selectedIds.value = []
      anchorComponentId.value = null
      return
    }
    if (multi) {
      const idx = selectedIds.value.indexOf(id)
      if (idx >= 0) {
        selectedIds.value = selectedIds.value.filter((x) => x !== id)
        if (anchorComponentId.value === id) {
          anchorComponentId.value = selectedIds.value[0] ?? null
        }
      } else {
        if (selectedIds.value.length === 0) {
          anchorComponentId.value = id
        }
        selectedIds.value = [...selectedIds.value, id]
      }
    } else {
      selectedIds.value = [id]
      anchorComponentId.value = id
    }
  }

  function selectComponents(ids: string[]) {
    selectedIds.value = ids
    anchorComponentId.value = ids[0] ?? null
  }

  function addComponent(type: ComponentType, x: number, y: number) {
    ensureNextComponentId()
    const { w, h } = getDefaultSize(type)
    const component: PageComponent = {
      id: `comp-${nextId++}`,
      type,
      x: Math.round(x - w / 2),
      y: Math.round(y - h / 2),
      w,
      h,
      props: getDefaultProps(type),
    }
    pushHistory()
    components.value = [...components.value, component]
    selectedIds.value = [component.id]
    anchorComponentId.value = component.id
  }

  function updateComponentProps(id: string, props: Record<string, unknown>) {
    const comp = getComponentById(id)
    if (!comp || isComponentLocked(comp)) return
    pushHistory()
    components.value = components.value.map((c) =>
      c.id === id ? { ...c, props: { ...c.props, ...props } } : c,
    )
  }

  function replaceComponentProps(id: string, props: Record<string, unknown>) {
    const comp = getComponentById(id)
    if (!comp || isComponentLocked(comp)) return
    pushHistory()
    components.value = components.value.map((c) =>
      c.id === id ? { ...c, props: { ...props } } : c,
    )
  }

  function moveComponent(id: string, x: number, y: number) {
    const comp = getComponentById(id)
    if (!comp || isComponentLocked(comp)) return
    pushHistory()
    components.value = components.value.map((c) => (c.id === id ? { ...c, x, y } : c))
  }

  function moveComponents(ids: string[], dx: number, dy: number) {
    const movable = filterUnlockedIds(ids)
    if (movable.length === 0) return
    pushHistory()
    const movableSet = new Set(movable)
    components.value = components.value.map((c) =>
      movableSet.has(c.id) ? { ...c, x: Math.round(c.x + dx), y: Math.round(c.y + dy) } : c,
    )
  }

  function applyComponentPositions(posById: Map<string, { x: number; y: number }>) {
    if (pageReadOnly.value || posById.size === 0) return
    pushHistory()
    components.value = components.value.map((c) => {
      const pos = posById.get(c.id)
      if (!pos) return c
      return { ...c, x: pos.x, y: pos.y }
    })
    triggerRef(components)
  }

  function resolveAnchorComponent(selected: PageComponent[], ids: string[]): PageComponent | undefined {
    let refId = anchorComponentId.value ?? ids[0]
    if (!refId || !ids.includes(refId)) refId = ids[0]
    if (!refId) return undefined
    return selected.find((c) => c.id === refId) ?? selected[0]
  }

  /** 垂直居中：其余组件 X 中心与基准组件垂直中线对齐 */
  function alignSelectedToFirstVerticalCenter() {
    alignSelectedToAnchorMidline('x')
  }

  /** 水平居中：其余组件 Y 中心与基准组件水平中线对齐 */
  function alignSelectedToFirstHorizontalCenter() {
    alignSelectedToAnchorMidline('y')
  }

  function alignSelectedToAnchorMidline(axis: 'x' | 'y') {
    if (pageReadOnly.value) return

    const ids = [...selectedIds.value]
    if (ids.length < 2) return

    const selected = components.value.filter((c) => ids.includes(c.id))
    if (selected.length < 2) return

    const ref = resolveAnchorComponent(selected, ids)
    if (!ref) return

    const refCenterX = Number(ref.x) + Number(ref.w) / 2
    const refCenterY = Number(ref.y) + Number(ref.h) / 2

    const posById = new Map<string, { x: number; y: number }>()
    for (const c of selected) {
      if (c.id === ref.id || isComponentLocked(c)) continue
      if (axis === 'x') {
        posById.set(c.id, {
          x: Math.round(refCenterX - Number(c.w) / 2),
          y: Number(c.y),
        })
      } else {
        posById.set(c.id, {
          x: Number(c.x),
          y: Math.round(refCenterY - Number(c.h) / 2),
        })
      }
    }

    applyComponentPositions(posById)
  }

  function alignSelectedComponents(mode: AlignMode) {
    const ids = selectedIds.value
    if (ids.length < 2 || hasLockedInSelection(ids)) return

    const selected = components.value.filter((c) => ids.includes(c.id))
    if (selected.length < 2) return

    const posById = new Map<string, { x: number; y: number }>()

    switch (mode) {
      case 'left': {
        const minX = Math.min(...selected.map((c) => c.x))
        for (const c of selected) posById.set(c.id, { x: minX, y: c.y })
        break
      }
      case 'right': {
        const maxRight = Math.max(...selected.map((c) => c.x + c.w))
        for (const c of selected) posById.set(c.id, { x: maxRight - c.w, y: c.y })
        break
      }
      case 'top': {
        const minY = Math.min(...selected.map((c) => c.y))
        for (const c of selected) posById.set(c.id, { x: c.x, y: minY })
        break
      }
      case 'bottom': {
        const maxBottom = Math.max(...selected.map((c) => c.y + c.h))
        for (const c of selected) posById.set(c.id, { x: c.x, y: maxBottom - c.h })
        break
      }
    }

    applyComponentPositions(posById)
  }

  function equalizeSelectedWidth() {
    const ids = selectedIds.value
    if (ids.length < 2 || hasLockedInSelection(ids)) return
    const ref = components.value.find((c) => c.id === ids[0])
    if (!ref) return

    const targetW = Math.max(MIN_COMPONENT_W, Math.round(ref.w))
    pushHistory()
    components.value = components.value.map((c) =>
      ids.includes(c.id) ? { ...c, w: targetW } : c,
    )
  }

  function equalizeSelectedHeight() {
    const ids = selectedIds.value
    if (ids.length < 2 || hasLockedInSelection(ids)) return
    const ref = components.value.find((c) => c.id === ids[0])
    if (!ref) return

    const targetH = Math.max(MIN_COMPONENT_H, Math.round(ref.h))
    pushHistory()
    components.value = components.value.map((c) =>
      ids.includes(c.id) ? { ...c, h: targetH } : c,
    )
  }

  /** 水平等距：在选区外框内按相邻组件外缘相等间距重排（左缘 min(x)，右缘 max(x+w)） */
  function distributeSelectedComponentsHorizontal() {
    const ids = selectedIds.value
    if (ids.length < 2 || hasLockedInSelection(ids)) return

    const selected = components.value.filter((c) => ids.includes(c.id))
    if (selected.length < 2) return

    const sorted = [...selected].sort((a, b) => a.x - b.x)
    const leftBound = Math.min(...selected.map((c) => c.x))
    const rightBound = Math.max(...selected.map((c) => c.x + c.w))
    const totalWidth = sorted.reduce((s, c) => s + c.w, 0)
    const gap = (rightBound - leftBound - totalWidth) / (sorted.length - 1)
    if (!Number.isFinite(gap)) return

    const posById = new Map<string, { x: number; y: number }>()
    const step = Math.max(0, gap)
    let cursor = leftBound
    for (const c of sorted) {
      posById.set(c.id, { x: Math.round(cursor), y: c.y })
      cursor += c.w + step
    }

    const changed = sorted.some((c) => {
      const pos = posById.get(c.id)!
      return pos.x !== c.x || pos.y !== c.y
    })
    if (!changed) return

    pushHistory()
    components.value = components.value.map((c) => {
      const pos = posById.get(c.id)
      if (!pos) return c
      return { ...c, x: pos.x, y: pos.y }
    })
  }

  /** 垂直等距：在选区外框内按相邻组件外缘相等间距重排（上缘 min(y)，下缘 max(y+h)） */
  function distributeSelectedComponentsVertical() {
    const ids = selectedIds.value
    if (ids.length < 2 || hasLockedInSelection(ids)) return

    const selected = components.value.filter((c) => ids.includes(c.id))
    if (selected.length < 2) return

    const sorted = [...selected].sort((a, b) => a.y - b.y)
    const topBound = Math.min(...selected.map((c) => c.y))
    const bottomBound = Math.max(...selected.map((c) => c.y + c.h))
    const totalHeight = sorted.reduce((s, c) => s + c.h, 0)
    const gap = (bottomBound - topBound - totalHeight) / (sorted.length - 1)
    if (!Number.isFinite(gap)) return

    const posById = new Map<string, { x: number; y: number }>()
    const step = Math.max(0, gap)
    let cursor = topBound
    for (const c of sorted) {
      posById.set(c.id, { x: c.x, y: Math.round(cursor) })
      cursor += c.h + step
    }

    const changed = sorted.some((c) => {
      const pos = posById.get(c.id)!
      return pos.x !== c.x || pos.y !== c.y
    })
    if (!changed) return

    pushHistory()
    components.value = components.value.map((c) => {
      const pos = posById.get(c.id)
      if (!pos) return c
      return { ...c, x: pos.x, y: pos.y }
    })
  }

  function resizeComponent(id: string, x: number, y: number, w: number, h: number) {
    const comp = getComponentById(id)
    if (!comp || isComponentLocked(comp)) return
    const layout = clampComponentLayout(
      { x, y, w, h },
      pageWidth.value,
      pageHeight.value,
    )
    pushHistory()
    components.value = components.value.map((c) =>
      c.id === id ? { ...c, ...layout } : c,
    )
  }

  /** 多选批量修改宽高（保留各自 x/y） */
  function setComponentsSize(ids: Iterable<string>, patch: { w?: number; h?: number }) {
    const idSet = new Set(ids)
    if (idSet.size === 0 || (patch.w === undefined && patch.h === undefined)) return
    const pw = pageWidth.value
    const ph = pageHeight.value
    let changed = false
    const next = components.value.map((c) => {
      if (!idSet.has(c.id) || isComponentLocked(c)) return c
      const layout = clampComponentLayout(
        { x: c.x, y: c.y, w: patch.w ?? c.w, h: patch.h ?? c.h },
        pw,
        ph,
      )
      if (layout.w !== c.w || layout.h !== c.h) changed = true
      return { ...c, w: layout.w, h: layout.h }
    })
    if (!changed) return
    pushHistory()
    components.value = next
  }

  function removeComponent(id: string) {
    const comp = getComponentById(id)
    if (!comp || isComponentLocked(comp)) return
    pushHistory()
    components.value = components.value.filter((c) => c.id !== id)
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  }

  function removeComponents(ids: string[]) {
    const removable = filterUnlockedIds(ids)
    if (removable.length === 0) return
    const removableSet = new Set(removable)
    pushHistory()
    components.value = components.value.filter((c) => !removableSet.has(c.id))
    selectedIds.value = selectedIds.value.filter((x) => !removableSet.has(x))
  }

  function bringToFront(id: string) {
    const comp = getComponentById(id)
    if (!comp || isComponentLocked(comp)) return
    const idx = components.value.findIndex((c) => c.id === id)
    if (idx < 0) return
    const arr = [...components.value]
    const [item] = arr.splice(idx, 1)
    arr.push(item!)
    pushHistory()
    components.value = arr
  }

  function sendToBack(id: string) {
    const comp = getComponentById(id)
    if (!comp || isComponentLocked(comp)) return
    const idx = components.value.findIndex((c) => c.id === id)
    if (idx < 0) return
    const arr = [...components.value]
    const [item] = arr.splice(idx, 1)
    arr.unshift(item!)
    pushHistory()
    components.value = arr
  }

  function bringForward(id: string) {
    const comp = getComponentById(id)
    if (!comp || isComponentLocked(comp)) return
    const idx = components.value.findIndex((c) => c.id === id)
    if (idx < 0 || idx >= components.value.length - 1) return
    const arr = [...components.value]
    ;[arr[idx], arr[idx + 1]] = [arr[idx + 1]!, arr[idx]!]
    pushHistory()
    components.value = arr
  }

  function sendBackward(id: string) {
    const comp = getComponentById(id)
    if (!comp || isComponentLocked(comp)) return
    const idx = components.value.findIndex((c) => c.id === id)
    if (idx <= 0) return
    const arr = [...components.value]
    ;[arr[idx], arr[idx - 1]] = [arr[idx - 1]!, arr[idx]!]
    pushHistory()
    components.value = arr
  }

  function copySelectedComponents() {
    if (selectedIds.value.length === 0) return
    clipboard.value = cloneComponentsByIds(components.value, selectedIds.value)
  }

  function cutSelectedComponents() {
    if (pageReadOnly.value || selectedIds.value.length === 0) return
    const unlocked = filterUnlockedIds(selectedIds.value)
    if (unlocked.length === 0) return
    clipboard.value = cloneComponentsByIds(components.value, unlocked)
    pushHistory()
    const unlockedSet = new Set(unlocked)
    components.value = components.value.filter((c) => !unlockedSet.has(c.id))
    selectedIds.value = selectedIds.value.filter((x) => !unlockedSet.has(x))
  }

  function pasteComponents() {
    if (pageReadOnly.value) return
    const source = clipboard.value
    if (!source || source.length === 0) return

    ensureNextComponentId()
    pushHistory()

    const newComps: PageComponent[] = []
    for (const c of source) {
      const cloned = clonePageComponent(c)
      newComps.push({
        ...cloned,
        id: `comp-${nextId++}`,
        x: Math.round(Number(cloned.x) + PASTE_OFFSET) || 0,
        y: Math.round(Number(cloned.y) + PASTE_OFFSET) || 0,
        locked: undefined,
      })
    }

    const existingIds = new Set(components.value.map((c) => c.id))
    for (const c of newComps) {
      if (existingIds.has(c.id)) {
        console.warn('[editor] paste: duplicate component id avoided by resync —', c.id)
        ensureNextComponentId()
        c.id = `comp-${nextId++}`
      }
      existingIds.add(c.id)
    }

    components.value = [...components.value, ...newComps]
    triggerRef(components)
    selectedIds.value = newComps.map((c) => c.id)
    anchorComponentId.value = newComps[0]?.id ?? null
    clipboard.value = newComps.map((c) => clonePageComponent(c))
  }

  function setGroupDragOffset(offset: { dx: number; dy: number } | null) {
    groupDragOffset.value = offset
  }

  function setPageName(name: string) {
    if (pageReadOnly.value) return
    pageName.value = name
  }
  function setPageSize(width: number, height: number) {
    if (pageReadOnly.value) return
    const s = clampPageSize(width, height)
    pageWidth.value = s.width
    pageHeight.value = s.height
  }
  function zoomIn() {
    hasUserZoomed.value = true
    userZoom.value = Math.min(ZOOM_MAX, userZoom.value + ZOOM_STEP)
  }
  function zoomOut() {
    hasUserZoomed.value = true
    userZoom.value = Math.max(ZOOM_MIN, userZoom.value - ZOOM_STEP)
  }
  function zoomReset() {
    hasUserZoomed.value = true
    userZoom.value = 100
  }
  function setZoom(percent: number) {
    userZoom.value = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.round(percent)))
  }
  function resetUserZoomFlag() {
    hasUserZoomed.value = false
  }
  function requestZoomToFit() {
    hasUserZoomed.value = false
    fitRequestCount.value++
  }
  function setBgColor(color: string) {
    if (pageReadOnly.value) return
    bgColor.value = color
  }
  function setBgColorTo(color: string) {
    if (pageReadOnly.value) return
    bgColorTo.value = color
  }
  function setBgGradient(gradient: BgGradient) {
    if (pageReadOnly.value) return
    bgGradient.value = gradient
  }
  function setBgImage(url: string) {
    if (pageReadOnly.value) return
    bgImage.value = url
  }
  function setBgOpacity(opacity: number) {
    if (pageReadOnly.value) return
    bgOpacity.value = opacity
  }

  function addDataSource(ds: DataSource) {
    pushHistory()
    dataSources.value = [...dataSources.value, ds]
  }
  function updateDataSource(id: string, partial: Partial<DataSource>) {
    pushHistory()
    dataSources.value = dataSources.value.map((ds) =>
      ds.id === id ? { ...ds, ...partial } : ds,
    )
  }
  function removeDataSource(id: string) {
    pushHistory()
    dataSources.value = dataSources.value.filter((ds) => ds.id !== id)
    components.value = components.value.map((c) =>
      c.dataSourceId === id ? { ...c, dataSourceId: undefined } : c,
    )
  }
  function setComponentDataSource(compId: string, dsId: string | undefined) {
    const comp = getComponentById(compId)
    if (!comp || isComponentLocked(comp)) return
    pushHistory()
    components.value = components.value.map((c) =>
      c.id === compId ? { ...c, dataSourceId: dsId } : c,
    )
  }

  function addColorDictEntry(entry: Omit<ColorDictEntry, 'id'>) {
    pushHistory()
    const e = { ...entry, id: `cd-${nextColorDictId++}` }
    colorDict.value = [...colorDict.value, e]
  }
  function updateColorDictEntry(id: string, entry: ColorDictEntry) {
    pushHistory()
    colorDict.value = colorDict.value.map((e) => (e.id === id ? entry : e))
  }
  function removeColorDictEntry(id: string) {
    pushHistory()
    colorDict.value = colorDict.value.filter((e) => e.id !== id)
  }

  function addIconDictEntry(entry: Omit<IconDictEntry, 'id'>) {
    pushHistory()
    const e = { ...entry, id: `id-${nextIconDictId++}` }
    iconDict.value = [...iconDict.value, e]
  }
  function updateIconDictEntry(id: string, entry: IconDictEntry) {
    pushHistory()
    iconDict.value = iconDict.value.map((e) => (e.id === id ? entry : e))
  }
  function removeIconDictEntry(id: string) {
    pushHistory()
    iconDict.value = iconDict.value.filter((e) => e.id !== id)
  }

  function addAbbrevDictEntry(entry: Omit<AbbrevDictEntry, 'id'>) {
    pushHistory()
    const e = { ...entry, id: `ad-${nextAbbrevDictId++}` }
    abbrevDict.value = [...abbrevDict.value, e]
  }
  function updateAbbrevDictEntry(id: string, entry: AbbrevDictEntry) {
    pushHistory()
    abbrevDict.value = abbrevDict.value.map((e) => (e.id === id ? entry : e))
  }
  function removeAbbrevDictEntry(id: string) {
    pushHistory()
    abbrevDict.value = abbrevDict.value.filter((e) => e.id !== id)
  }

  function mergeSavedIcon(record: CustomIconRecord) {
    if (pageReadOnly.value) return
    savedIcons.value = mergeSavedIconIntoPool(savedIcons.value, record)
  }

  function importPageConfig(config: {
    dataSources?: DataSource[]
    colorDict?: ColorDictEntry[]
    iconDict?: IconDictEntry[]
    savedIcons?: CustomIconRecord[]
    abbrevDict?: AbbrevDictEntry[]
  }) {
    pushHistory()
    if (config.dataSources !== undefined) {
      dataSources.value = config.dataSources.map((ds) => ({ ...ds }))
    }
    if (config.colorDict !== undefined) {
      colorDict.value = config.colorDict.map((entry) => ({ ...entry, id: `cd-${nextColorDictId++}` }))
    }
    if (config.iconDict !== undefined) {
      iconDict.value = config.iconDict.map((entry) => ({ ...entry, id: `id-${nextIconDictId++}` }))
    }
    if (config.savedIcons !== undefined) {
      savedIcons.value = config.savedIcons.map((icon) => ({ ...icon }))
    }
    if (config.abbrevDict !== undefined) {
      abbrevDict.value = config.abbrevDict.map((entry) => ({ ...entry, id: `ad-${nextAbbrevDictId++}` }))
    }
  }

  function loadPage(pId: number, name: string, schema: PageSchema, scope: PageScope = 'draft') {
    const comps = Array.isArray(schema.components) ? schema.components : []
    let maxNum = 0
    for (const c of comps) {
      const m = c.id.match(/^comp-(\d+)$/)
      if (m) maxNum = Math.max(maxNum, Number(m[1]))
    }
    nextId = maxNum + 1

    let maxCd = 0
    const migrated = (schema.colorDict ?? []).map((e, i) => {
      if (e.id) {
        const m = e.id.match(/^cd-(\d+)$/)
        if (m) maxCd = Math.max(maxCd, Number(m[1]))
        return e
      }
      return { ...e, id: `cd-legacy-${i}` }
    })
    nextColorDictId = maxCd + 1

    let maxId = 0
    const migratedIcon = (schema.iconDict ?? []).map((e, i) => {
      if (e.id) {
        const m = e.id.match(/^id-(\d+)$/)
        if (m) maxId = Math.max(maxId, Number(m[1]))
        return e
      }
      return { ...e, id: `id-legacy-${i}` }
    })
    nextIconDictId = maxId + 1

    let maxAd = 0
    const migratedAbbrev = (schema.abbrevDict ?? []).map((e, i) => {
      if (e.id) {
        const m = e.id.match(/^ad-(\d+)$/)
        if (m) maxAd = Math.max(maxAd, Number(m[1]))
        return e
      }
      return { ...e, id: `ad-legacy-${i}` }
    })
    nextAbbrevDictId = maxAd + 1

    const legacy = schema as PageSchema & { pageWidth?: number; pageHeight?: number }
    const { width: w, height: h } = clampPageSize(
      legacy.width ?? legacy.pageWidth ?? DEFAULT_PAGE_WIDTH,
      legacy.height ?? legacy.pageHeight ?? DEFAULT_PAGE_HEIGHT,
    )

    pageId.value = pId
    pageScope.value = scope
    pageName.value = name
    pageWidth.value = w
    pageHeight.value = h
    bgColor.value = schema.bgColor ?? '#0d1520'
    bgColorTo.value = schema.bgColorTo ?? DEFAULT_GRADIENT_COLOR_TO
    bgGradient.value = schema.bgGradient ?? 'none'
    bgImage.value = schema.bgImage ?? ''
    bgOpacity.value = schema.bgOpacity ?? 1
    dataSources.value = schema.dataSources ?? []
    colorDict.value = migrated
    iconDict.value = migratedIcon
    savedIcons.value = collectSavedIconsFromSchema(schema)
    abbrevDict.value = migratedAbbrev
    components.value = comps
    selectedIds.value = []
    anchorComponentId.value = null
    clipboard.value = null
    past.value = []
    future.value = []
  }

  function toSchema(): PageSchema {
    const referenced = collectReferencedSavedIconIds(iconDict.value, components.value)
    const snapshot = buildSavedIconsSnapshot(savedIcons.value, referenced)
    return {
      width: pageWidth.value,
      height: pageHeight.value,
      bgColor: bgColor.value,
      bgColorTo: bgGradient.value !== 'none' ? bgColorTo.value : undefined,
      bgGradient: bgGradient.value,
      bgImage: bgImage.value || undefined,
      bgOpacity: bgOpacity.value,
      dataSources: dataSources.value,
      colorDict: colorDict.value.length > 0 ? colorDict.value : undefined,
      iconDict: iconDict.value.length > 0 ? iconDict.value : undefined,
      savedIcons: snapshot,
      abbrevDict: abbrevDict.value.length > 0 ? abbrevDict.value : undefined,
      components: components.value,
    }
  }

  return {
    // state
    components, selectedIds, anchorComponentId, pageId, pageScope, pageName, pageWidth, pageHeight,
    bgColor, bgColorTo, bgGradient, bgImage, bgOpacity,
    dataSources, colorDict, iconDict, savedIcons, abbrevDict,
    past, future, groupDragOffset, clipboard,
    // zoom
    userZoom, canvasScale, hasUserZoomed, fitRequestCount,
    // computed
    pageReadOnly,
    firstSelectedId, canUndo, canRedo, canCopy, canPaste, canCut, canDelete,
    canMoveUp, canMoveDown, canAlign,
    // actions
    undo, redo,
    selectComponent, selectComponents,
    addComponent, updateComponentProps, replaceComponentProps,
    moveComponent, moveComponents, alignSelectedComponents,
    alignSelectedToFirstVerticalCenter, alignSelectedToFirstHorizontalCenter,
    equalizeSelectedWidth, equalizeSelectedHeight,
    distributeSelectedComponentsHorizontal, distributeSelectedComponentsVertical,
    resizeComponent,
    setComponentsSize,
    removeComponent, removeComponents,
    setComponentLocked, setComponentsLocked, hasLockedInSelection,
    bringToFront, sendToBack, bringForward, sendBackward,
    copySelectedComponents, cutSelectedComponents, pasteComponents,
    setGroupDragOffset,
    setPageName, setPageSize, setBgColor, setBgColorTo, setBgGradient, setBgImage, setBgOpacity,
    zoomIn, zoomOut, zoomReset, setZoom, resetUserZoomFlag, requestZoomToFit,
    addDataSource, updateDataSource, removeDataSource, setComponentDataSource,
    addColorDictEntry, updateColorDictEntry, removeColorDictEntry,
    addIconDictEntry, updateIconDictEntry, removeIconDictEntry,
    mergeSavedIcon,
    addAbbrevDictEntry, updateAbbrevDictEntry, removeAbbrevDictEntry,
    importPageConfig,
    loadPage, toSchema,
  }
})
