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
  mergeSavedIconIntoPool, isComponentLocked, isEditorLocked, isGroupLocked,
} from '@mvp-vue/schema'
import { clampPageSize } from '../pageSizePresets'
import { clampComponentLayout } from '../utils/componentLayout'
import {
  expandIdsToFullGroups,
  collectMembersForGrouping,
  getGroupMembers,
  computeGroupBounds,
  scaleMembersToBounds,
  isFullGroupSelection,
  cleanupOrphanGroupIds,
  isGroupLockedById,
  selectionHasGroupId,
  clampGroupBounds,
  buildAlignUnits,
  findAlignUnitForMember,
  memberPositionsFromUnitOrigins,
  type AlignUnit,
} from '../utils/componentGroup'
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
let nextGroupId = 1
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
    if (isFullGroupSelection(components.value, selectedIds.value).isFullGroup) return false
    const units = buildAlignUnits(components.value, selectedIds.value)
    if (units.length < 2) return false
    const ids = selectedIds.value
    if (!hasLockedInSelection(ids)) return true
    const refId = anchorComponentId.value ?? ids[0]!
    return filterUnlockedIds(ids.filter((id) => id !== refId)).length > 0
  })
  const fullGroupSelection = computed(() =>
    isFullGroupSelection(components.value, selectedIds.value),
  )
  const activeGroupId = computed(() =>
    fullGroupSelection.value.isFullGroup ? fullGroupSelection.value.groupId : null,
  )
  const activeGroupBounds = computed(() => {
    const gid = activeGroupId.value
    if (!gid) return null
    const members = getGroupMembers(components.value, gid)
    return computeGroupBounds(members)
  })
  const activeGroupLocked = computed(() => {
    const gid = activeGroupId.value
    if (!gid) return false
    return isGroupLockedById(components.value, gid)
  })
  const canGroup = computed(() => {
    if (pageReadOnly.value) return false
    const expanded = expandIdsToFullGroups(components.value, selectedIds.value)
    if (expanded.length < 2) return false
    if (hasLockedInSelection(expanded)) return false
    if (isFullGroupSelection(components.value, expanded).isFullGroup) return false
    return true
  })
  const canUngroup = computed(() => {
    if (pageReadOnly.value) return false
    return selectionHasGroupId(components.value, selectedIds.value)
  })
  const canCut = computed(() => {
    if (pageReadOnly.value) return false
    if (selectedIds.value.length === 0) return false
    return selectedIds.value.some((id) => {
      const c = components.value.find((x) => x.id === id)
      return c && !isEditorLocked(c)
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

  function ensureNextGroupId() {
    let maxNum = 0
    for (const c of components.value) {
      const m = c.groupId?.match(/^group-(\d+)$/)
      if (m) maxNum = Math.max(maxNum, Number(m[1]))
    }
    if (nextGroupId <= maxNum) nextGroupId = maxNum + 1
  }

  function applyExpandedSelection(ids: string[], anchor?: string | null) {
    const expanded = expandIdsToFullGroups(components.value, ids)
    selectedIds.value = expanded
    if (anchor !== undefined) {
      anchorComponentId.value = anchor
    } else if (expanded.length > 0 && !expanded.includes(anchorComponentId.value ?? '')) {
      anchorComponentId.value = expanded[0] ?? null
    }
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
      return c != null && isEditorLocked(c)
    })
  }

  function filterUnlockedIds(ids: string[]): string[] {
    return ids.filter((id) => {
      const c = getComponentById(id)
      return c != null && !isEditorLocked(c)
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

  function setGroupLocked(groupId: string, locked: boolean) {
    if (pageReadOnly.value) return
    const members = getGroupMembers(components.value, groupId)
    if (members.length === 0) return
    const hasChange = members.some((c) => !!c.groupLocked !== locked)
    if (!hasChange) return
    pushHistory()
    components.value = components.value.map((c) =>
      c.groupId === groupId ? { ...c, groupLocked: locked || undefined } : c,
    )
  }

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
      const expandedTarget = expandIdsToFullGroups(components.value, [id])
      const allSelected = expandedTarget.every((x) => selectedIds.value.includes(x))
      if (allSelected) {
        const removeSet = new Set(expandedTarget)
        const remaining = selectedIds.value.filter((x) => !removeSet.has(x))
        applyExpandedSelection(remaining)
        if (anchorComponentId.value && removeSet.has(anchorComponentId.value)) {
          anchorComponentId.value = selectedIds.value[0] ?? null
        }
      } else {
        const merged = expandIdsToFullGroups(components.value, [...selectedIds.value, id])
        const anchor = selectedIds.value.length === 0 ? id : anchorComponentId.value
        applyExpandedSelection(merged, anchor ?? id)
      }
    } else {
      const expanded = expandIdsToFullGroups(components.value, [id])
      selectedIds.value = expanded
      anchorComponentId.value = id
    }
  }

  function selectComponents(ids: string[]) {
    applyExpandedSelection(ids, ids[0] ?? null)
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
    updateComponentsProps([id], props)
  }

  function updateComponentsProps(ids: string[], propsPatch: Record<string, unknown>) {
    if (pageReadOnly.value) return
    const idSet = new Set(ids)
    const targets = components.value.filter(
      (c) => idSet.has(c.id) && !isEditorLocked(c) && !c.groupId,
    )
    if (targets.length === 0) return

    const changed = targets.some((c) =>
      Object.entries(propsPatch).some(([key, val]) => c.props[key] !== val),
    )
    if (!changed) return

    pushHistory()
    const targetIdSet = new Set(targets.map((c) => c.id))
    components.value = components.value.map((c) =>
      targetIdSet.has(c.id) ? { ...c, props: { ...c.props, ...propsPatch } } : c,
    )
  }

  function replaceComponentProps(id: string, props: Record<string, unknown>) {
    const comp = getComponentById(id)
    if (!comp || isEditorLocked(comp) || comp.groupId) return
    pushHistory()
    components.value = components.value.map((c) =>
      c.id === id ? { ...c, props: { ...props } } : c,
    )
  }

  function moveComponent(id: string, x: number, y: number) {
    const comp = getComponentById(id)
    if (!comp || isEditorLocked(comp)) return
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

  function isAlignUnitLocked(unit: AlignUnit): boolean {
    return unit.memberIds.some((id) => {
      const c = getComponentById(id)
      return c != null && isEditorLocked(c)
    })
  }

  function resolveAnchorAlignUnit(units: AlignUnit[], ids: string[]): AlignUnit | undefined {
    let refId = anchorComponentId.value ?? ids[0]
    if (!refId || !ids.includes(refId)) refId = ids[0]
    if (!refId) return undefined
    return findAlignUnitForMember(units, refId) ?? units[0]
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

    const units = buildAlignUnits(components.value, ids)
    if (units.length < 2) return

    const refUnit = resolveAnchorAlignUnit(units, ids)
    if (!refUnit) return

    const refCenterX = refUnit.bounds.x + refUnit.bounds.w / 2
    const refCenterY = refUnit.bounds.y + refUnit.bounds.h / 2

    const targetOriginByKey = new Map<string, { x: number; y: number }>()
    for (const unit of units) {
      if (unit.key === refUnit.key || isAlignUnitLocked(unit)) continue
      if (axis === 'x') {
        targetOriginByKey.set(unit.key, {
          x: Math.round(refCenterX - unit.bounds.w / 2),
          y: unit.bounds.y,
        })
      } else {
        targetOriginByKey.set(unit.key, {
          x: unit.bounds.x,
          y: Math.round(refCenterY - unit.bounds.h / 2),
        })
      }
    }

    applyComponentPositions(memberPositionsFromUnitOrigins(components.value, units, targetOriginByKey))
  }

  function alignSelectedComponents(mode: AlignMode) {
    const ids = selectedIds.value
    if (ids.length < 2 || hasLockedInSelection(ids)) return

    const units = buildAlignUnits(components.value, ids)
    if (units.length < 2) return

    const targetOriginByKey = new Map<string, { x: number; y: number }>()

    switch (mode) {
      case 'left': {
        const minX = Math.min(...units.map((u) => u.bounds.x))
        for (const u of units) targetOriginByKey.set(u.key, { x: minX, y: u.bounds.y })
        break
      }
      case 'right': {
        const maxRight = Math.max(...units.map((u) => u.bounds.x + u.bounds.w))
        for (const u of units) {
          targetOriginByKey.set(u.key, { x: maxRight - u.bounds.w, y: u.bounds.y })
        }
        break
      }
      case 'top': {
        const minY = Math.min(...units.map((u) => u.bounds.y))
        for (const u of units) targetOriginByKey.set(u.key, { x: u.bounds.x, y: minY })
        break
      }
      case 'bottom': {
        const maxBottom = Math.max(...units.map((u) => u.bounds.y + u.bounds.h))
        for (const u of units) {
          targetOriginByKey.set(u.key, { x: u.bounds.x, y: maxBottom - u.bounds.h })
        }
        break
      }
    }

    applyComponentPositions(memberPositionsFromUnitOrigins(components.value, units, targetOriginByKey))
  }

  function equalizeSelectedWidth() {
    const ids = selectedIds.value
    if (ids.length < 2 || hasLockedInSelection(ids)) return

    const units = buildAlignUnits(components.value, ids)
    if (units.length < 2) return

    const refUnit = resolveAnchorAlignUnit(units, ids)
    if (!refUnit) return

    const targetW = Math.max(MIN_COMPONENT_W, Math.round(refUnit.bounds.w))
    pushHistory()

    let next = components.value
    for (const unit of units) {
      if (unit.key === refUnit.key || isAlignUnitLocked(unit)) continue

      if (unit.kind === 'component') {
        const id = unit.memberIds[0]!
        next = next.map((c) => (c.id === id ? { ...c, w: targetW } : c))
        continue
      }

      const members = getGroupMembers(next, unit.groupId!)
      const oldBounds = computeGroupBounds(members)
      if (!oldBounds) continue

      const clamped = clampGroupBounds(
        { x: oldBounds.x, y: oldBounds.y, w: targetW, h: oldBounds.h },
        pageWidth.value,
        pageHeight.value,
      )
      const scaled = scaleMembersToBounds(members, oldBounds, clamped)
      const scaledById = new Map(scaled.map((c) => [c.id, c]))
      next = next.map((c) => {
        const scaledComp = scaledById.get(c.id)
        if (!scaledComp) return c
        const layout = clampComponentLayout(
          { x: scaledComp.x, y: scaledComp.y, w: scaledComp.w, h: scaledComp.h },
          pageWidth.value,
          pageHeight.value,
        )
        return { ...c, ...layout }
      })
    }

    components.value = next
    triggerRef(components)
  }

  function equalizeSelectedHeight() {
    const ids = selectedIds.value
    if (ids.length < 2 || hasLockedInSelection(ids)) return

    const units = buildAlignUnits(components.value, ids)
    if (units.length < 2) return

    const refUnit = resolveAnchorAlignUnit(units, ids)
    if (!refUnit) return

    const targetH = Math.max(MIN_COMPONENT_H, Math.round(refUnit.bounds.h))
    pushHistory()

    let next = components.value
    for (const unit of units) {
      if (unit.key === refUnit.key || isAlignUnitLocked(unit)) continue

      if (unit.kind === 'component') {
        const id = unit.memberIds[0]!
        next = next.map((c) => (c.id === id ? { ...c, h: targetH } : c))
        continue
      }

      const members = getGroupMembers(next, unit.groupId!)
      const oldBounds = computeGroupBounds(members)
      if (!oldBounds) continue

      const clamped = clampGroupBounds(
        { x: oldBounds.x, y: oldBounds.y, w: oldBounds.w, h: targetH },
        pageWidth.value,
        pageHeight.value,
      )
      const scaled = scaleMembersToBounds(members, oldBounds, clamped)
      const scaledById = new Map(scaled.map((c) => [c.id, c]))
      next = next.map((c) => {
        const scaledComp = scaledById.get(c.id)
        if (!scaledComp) return c
        const layout = clampComponentLayout(
          { x: scaledComp.x, y: scaledComp.y, w: scaledComp.w, h: scaledComp.h },
          pageWidth.value,
          pageHeight.value,
        )
        return { ...c, ...layout }
      })
    }

    components.value = next
    triggerRef(components)
  }

  /** 水平等距：在选区外框内按相邻组件外缘相等间距重排（左缘 min(x)，右缘 max(x+w)） */
  function distributeSelectedComponentsHorizontal() {
    const ids = selectedIds.value
    if (ids.length < 2 || hasLockedInSelection(ids)) return

    const units = buildAlignUnits(components.value, ids)
    if (units.length < 2) return

    const sorted = [...units].sort((a, b) => a.bounds.x - b.bounds.x)
    const leftBound = Math.min(...units.map((u) => u.bounds.x))
    const rightBound = Math.max(...units.map((u) => u.bounds.x + u.bounds.w))
    const totalWidth = sorted.reduce((s, u) => s + u.bounds.w, 0)
    const gap = (rightBound - leftBound - totalWidth) / (sorted.length - 1)
    if (!Number.isFinite(gap)) return

    const targetOriginByKey = new Map<string, { x: number; y: number }>()
    const step = Math.max(0, gap)
    let cursor = leftBound
    for (const u of sorted) {
      targetOriginByKey.set(u.key, { x: Math.round(cursor), y: u.bounds.y })
      cursor += u.bounds.w + step
    }

    const posById = memberPositionsFromUnitOrigins(components.value, units, targetOriginByKey)
    const changed = sorted.some((u) => {
      const target = targetOriginByKey.get(u.key)!
      return target.x !== u.bounds.x || target.y !== u.bounds.y
    })
    if (!changed) return

    applyComponentPositions(posById)
  }

  /** 垂直等距：在选区外框内按相邻组件外缘相等间距重排（上缘 min(y)，下缘 max(y+h)） */
  function distributeSelectedComponentsVertical() {
    const ids = selectedIds.value
    if (ids.length < 2 || hasLockedInSelection(ids)) return

    const units = buildAlignUnits(components.value, ids)
    if (units.length < 2) return

    const sorted = [...units].sort((a, b) => a.bounds.y - b.bounds.y)
    const topBound = Math.min(...units.map((u) => u.bounds.y))
    const bottomBound = Math.max(...units.map((u) => u.bounds.y + u.bounds.h))
    const totalHeight = sorted.reduce((s, u) => s + u.bounds.h, 0)
    const gap = (bottomBound - topBound - totalHeight) / (sorted.length - 1)
    if (!Number.isFinite(gap)) return

    const targetOriginByKey = new Map<string, { x: number; y: number }>()
    const step = Math.max(0, gap)
    let cursor = topBound
    for (const u of sorted) {
      targetOriginByKey.set(u.key, { x: u.bounds.x, y: Math.round(cursor) })
      cursor += u.bounds.h + step
    }

    const posById = memberPositionsFromUnitOrigins(components.value, units, targetOriginByKey)
    const changed = sorted.some((u) => {
      const target = targetOriginByKey.get(u.key)!
      return target.x !== u.bounds.x || target.y !== u.bounds.y
    })
    if (!changed) return

    applyComponentPositions(posById)
  }

  function resizeComponent(id: string, x: number, y: number, w: number, h: number) {
    const comp = getComponentById(id)
    if (!comp || isEditorLocked(comp)) return
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
      if (!idSet.has(c.id) || isEditorLocked(c)) return c
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
    if (!comp || isEditorLocked(comp)) return
    pushHistory()
    components.value = cleanupOrphanGroupIds(components.value.filter((c) => c.id !== id))
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  }

  function removeComponents(ids: string[]) {
    const expanded = expandIdsToFullGroups(components.value, ids)
    const removable = filterUnlockedIds(expanded)
    if (removable.length === 0) return
    const removableSet = new Set(removable)
    pushHistory()
    components.value = cleanupOrphanGroupIds(components.value.filter((c) => !removableSet.has(c.id)))
    selectedIds.value = selectedIds.value.filter((x) => !removableSet.has(x))
  }

  function bringToFront(id: string) {
    const comp = getComponentById(id)
    if (!comp || isEditorLocked(comp)) return
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
    if (!comp || isEditorLocked(comp)) return
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
    if (!comp || isEditorLocked(comp)) return
    const idx = components.value.findIndex((c) => c.id === id)
    if (idx < 0 || idx >= components.value.length - 1) return
    const arr = [...components.value]
    ;[arr[idx], arr[idx + 1]] = [arr[idx + 1]!, arr[idx]!]
    pushHistory()
    components.value = arr
  }

  function sendBackward(id: string) {
    const comp = getComponentById(id)
    if (!comp || isEditorLocked(comp)) return
    const idx = components.value.findIndex((c) => c.id === id)
    if (idx <= 0) return
    const arr = [...components.value]
    ;[arr[idx], arr[idx - 1]] = [arr[idx - 1]!, arr[idx]!]
    pushHistory()
    components.value = arr
  }

  function copySelectedComponents() {
    if (selectedIds.value.length === 0) return
    const expanded = expandIdsToFullGroups(components.value, selectedIds.value)
    clipboard.value = cloneComponentsByIds(components.value, expanded)
  }

  function cutSelectedComponents() {
    if (pageReadOnly.value || selectedIds.value.length === 0) return
    const expanded = expandIdsToFullGroups(components.value, selectedIds.value)
    const unlocked = filterUnlockedIds(expanded)
    if (unlocked.length === 0) return
    clipboard.value = cloneComponentsByIds(components.value, unlocked)
    pushHistory()
    const unlockedSet = new Set(unlocked)
    components.value = cleanupOrphanGroupIds(components.value.filter((c) => !unlockedSet.has(c.id)))
    selectedIds.value = selectedIds.value.filter((x) => !unlockedSet.has(x))
  }

  function pasteComponents() {
    if (pageReadOnly.value) return
    const source = clipboard.value
    if (!source || source.length === 0) return

    ensureNextComponentId()
    ensureNextGroupId()
    pushHistory()

    const groupIdMap = new Map<string, string>()
    for (const c of source) {
      if (c.groupId && !groupIdMap.has(c.groupId)) {
        groupIdMap.set(c.groupId, `group-${nextGroupId++}`)
      }
    }

    const newComps: PageComponent[] = []
    for (const c of source) {
      const cloned = clonePageComponent(c)
      newComps.push({
        ...cloned,
        id: `comp-${nextId++}`,
        x: Math.round(Number(cloned.x) + PASTE_OFFSET) || 0,
        y: Math.round(Number(cloned.y) + PASTE_OFFSET) || 0,
        locked: undefined,
        groupId: cloned.groupId ? groupIdMap.get(cloned.groupId) : undefined,
        groupLocked: cloned.groupId && cloned.groupLocked ? true : undefined,
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
    const pastedIds = newComps.map((c) => c.id)
    applyExpandedSelection(pastedIds, pastedIds[0] ?? null)
    clipboard.value = newComps.map((c) => clonePageComponent(c))
  }

  function groupSelectedComponents() {
    if (!canGroup.value) return
    const memberIds = collectMembersForGrouping(components.value, selectedIds.value)
    if (memberIds.length < 2) return

    ensureNextGroupId()
    const newGroupId = `group-${nextGroupId++}`
    const memberSet = new Set(memberIds)

    pushHistory()
    components.value = components.value.map((c) =>
      memberSet.has(c.id) ? { ...c, groupId: newGroupId } : c,
    )
    applyExpandedSelection(memberIds, memberIds[0] ?? null)
  }

  function ungroupSelectedComponents() {
    if (!canUngroup.value) return

    const groupIds = new Set<string>()
    for (const id of selectedIds.value) {
      const comp = getComponentById(id)
      if (comp?.groupId) groupIds.add(comp.groupId)
    }
    if (groupIds.size === 0) return

    pushHistory()
    components.value = components.value.map((c) => {
      if (!c.groupId || !groupIds.has(c.groupId)) return c
      const { groupId: _, groupLocked: __, ...rest } = c
      return rest as PageComponent
    })
  }

function resizeGroup(
    groupId: string,
    newBounds: { x: number; y: number; w: number; h: number },
    options?: { recordHistory?: boolean },
  ) {
    if (pageReadOnly.value) return
    const members = getGroupMembers(components.value, groupId)
    if (members.length === 0) return
    if (isGroupLockedById(components.value, groupId)) return

    const oldBounds = computeGroupBounds(members)
    if (!oldBounds) return

    const clamped = clampGroupBounds(newBounds, pageWidth.value, pageHeight.value)
    const scaled = scaleMembersToBounds(members, oldBounds, clamped)

    const scaledById = new Map(scaled.map((c) => [c.id, c]))
    const changed = members.some((c) => {
      const next = scaledById.get(c.id)
      if (!next) return false
      return next.x !== c.x || next.y !== c.y || next.w !== c.w || next.h !== c.h
    })
    if (!changed) return

    if (options?.recordHistory !== false) pushHistory()
    components.value = components.value.map((c) => {
      const next = scaledById.get(c.id)
      if (!next) return c
      const layout = clampComponentLayout(
        { x: next.x, y: next.y, w: next.w, h: next.h },
        pageWidth.value,
        pageHeight.value,
      )
      return { ...c, ...layout }
    })
  }

  function moveGroupByBounds(groupId: string, x: number, y: number) {
    if (pageReadOnly.value) return
    const members = getGroupMembers(components.value, groupId)
    if (members.length === 0) return
    const oldBounds = computeGroupBounds(members)
    if (!oldBounds) return
    const dx = x - oldBounds.x
    const dy = y - oldBounds.y
    if (dx === 0 && dy === 0) return
    moveComponents(members.map((m) => m.id), dx, dy)
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
    setComponentsDataSource([compId], dsId)
  }

  function setComponentsDataSource(ids: string[], dsId: string | undefined) {
    if (pageReadOnly.value) return
    const idSet = new Set(ids)
    const targets = components.value.filter((c) => idSet.has(c.id) && !isEditorLocked(c))
    if (targets.length === 0) return

    const changed = targets.some((c) => c.dataSourceId !== dsId)
    if (!changed) return

    pushHistory()
    const targetIdSet = new Set(targets.map((c) => c.id))
    components.value = components.value.map((c) =>
      targetIdSet.has(c.id) ? { ...c, dataSourceId: dsId } : c,
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
    let maxGroupNum = 0
    for (const c of comps) {
      const m = c.id.match(/^comp-(\d+)$/)
      if (m) maxNum = Math.max(maxNum, Number(m[1]))
      const gm = c.groupId?.match(/^group-(\d+)$/)
      if (gm) maxGroupNum = Math.max(maxGroupNum, Number(gm[1]))
    }
    nextId = maxNum + 1
    nextGroupId = maxGroupNum + 1

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
    components.value = cleanupOrphanGroupIds(comps)
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
    canMoveUp, canMoveDown, canAlign, canGroup, canUngroup,
    fullGroupSelection, activeGroupId, activeGroupBounds, activeGroupLocked,
    // actions
    undo, redo,
    selectComponent, selectComponents,
    addComponent, updateComponentProps, updateComponentsProps, replaceComponentProps,
    moveComponent, moveComponents, alignSelectedComponents,
    alignSelectedToFirstVerticalCenter, alignSelectedToFirstHorizontalCenter,
    equalizeSelectedWidth, equalizeSelectedHeight,
    distributeSelectedComponentsHorizontal, distributeSelectedComponentsVertical,
    resizeComponent,
    setComponentsSize,
    removeComponent, removeComponents,
    setComponentLocked, setComponentsLocked, setGroupLocked, hasLockedInSelection,
    bringToFront, sendToBack, bringForward, sendBackward,
    copySelectedComponents, cutSelectedComponents, pasteComponents,
    groupSelectedComponents, ungroupSelectedComponents, resizeGroup, moveGroupByBounds,
    setGroupDragOffset,
    setPageName, setPageSize, setBgColor, setBgColorTo, setBgGradient, setBgImage, setBgOpacity,
    zoomIn, zoomOut, zoomReset, setZoom, resetUserZoomFlag, requestZoomToFit,
    addDataSource, updateDataSource, removeDataSource, setComponentDataSource, setComponentsDataSource,
    addColorDictEntry, updateColorDictEntry, removeColorDictEntry,
    addIconDictEntry, updateIconDictEntry, removeIconDictEntry,
    mergeSavedIcon,
    addAbbrevDictEntry, updateAbbrevDictEntry, removeAbbrevDictEntry,
    importPageConfig,
    loadPage, toSchema,
  }
})
