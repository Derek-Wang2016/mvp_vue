import { defineStore } from 'pinia'
import { shallowRef, ref, computed } from 'vue'
import type { PageComponent, ComponentType, PageSchema, DataSource, ColorDictEntry, IconDictEntry, AbbrevDictEntry, BgGradient } from '@mvp-vue/schema'
import { DEFAULT_PAGE_WIDTH, DEFAULT_PAGE_HEIGHT } from '@mvp-vue/schema'
import { clampPageSize } from '../pageSizePresets'
import { getDefaultProps, getDefaultSize } from '../components/registry/registry'

const MAX_HISTORY = 50
const PASTE_OFFSET = 20

function cloneComponentsByIds(components: PageComponent[], ids: string[]): PageComponent[] {
  return components.filter((c) => ids.includes(c.id)).map((c) => structuredClone(c))
}

interface Snapshot {
  components: PageComponent[]
  nextId: number
}

let nextId = 1
let nextColorDictId = 1
let nextIconDictId = 1
let nextAbbrevDictId = 1

export const useEditorStore = defineStore('editor', () => {
  // === state ===
  const components = shallowRef<PageComponent[]>([])
  const selectedIds = ref<string[]>([])
  const pageId = ref<number | null>(null)
  const pageName = ref('未命名大屏')
  const pageWidth = ref(DEFAULT_PAGE_WIDTH)
  const pageHeight = ref(DEFAULT_PAGE_HEIGHT)
  const bgColor = ref('#0d1520')
  const bgGradient = ref<BgGradient>('none')
  const bgImage = ref('')
  const bgOpacity = ref(1)
  const dataSources = ref<DataSource[]>([])
  const colorDict = ref<ColorDictEntry[]>([])
  const iconDict = ref<IconDictEntry[]>([])
  const abbrevDict = ref<AbbrevDictEntry[]>([])

  const past = ref<Snapshot[]>([])
  const future = ref<Snapshot[]>([])
  const groupDragOffset = ref<{ dx: number; dy: number } | null>(null)
  const clipboard = ref<PageComponent[] | null>(null)

  // === computed ===
  const firstSelectedId = computed(() => selectedIds.value[0] ?? null)
  const canUndo = computed(() => past.value.length > 0)
  const canRedo = computed(() => future.value.length > 0)
  const canCopy = computed(() => selectedIds.value.length > 0)
  const canPaste = computed(() => !!(clipboard.value && clipboard.value.length > 0))
  const canMoveUp = computed(() => {
    const id = firstSelectedId.value
    if (!id) return false
    const idx = components.value.findIndex((c) => c.id === id)
    return idx >= 0 && idx < components.value.length - 1
  })
  const canMoveDown = computed(() => {
    const id = firstSelectedId.value
    if (!id) return false
    const idx = components.value.findIndex((c) => c.id === id)
    return idx > 0
  })

  // === helpers ===
  function pushHistory() {
    past.value = [...past.value, { components: structuredClone(components.value), nextId }].slice(-MAX_HISTORY)
    future.value = []
  }

  // === actions ===
  function undo() {
    if (past.value.length === 0) return
    const prev = past.value[past.value.length - 1]!
    future.value = [...future.value, { components: structuredClone(components.value), nextId }]
    past.value = past.value.slice(0, -1)
    components.value = structuredClone(prev.components)
    selectedIds.value = []
    nextId = prev.nextId
  }

  function redo() {
    if (future.value.length === 0) return
    const nxt = future.value[future.value.length - 1]!
    past.value = [...past.value, { components: structuredClone(components.value), nextId }]
    future.value = future.value.slice(0, -1)
    components.value = structuredClone(nxt.components)
    selectedIds.value = []
    nextId = nxt.nextId
  }

  function selectComponent(id: string | null, multi = false) {
    if (!id) {
      selectedIds.value = []
      return
    }
    if (multi) {
      const idx = selectedIds.value.indexOf(id)
      if (idx >= 0) {
        selectedIds.value = selectedIds.value.filter((x) => x !== id)
      } else {
        selectedIds.value = [...selectedIds.value, id]
      }
    } else {
      selectedIds.value = [id]
    }
  }

  function selectComponents(ids: string[]) {
    selectedIds.value = ids
  }

  function addComponent(type: ComponentType, x: number, y: number) {
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
  }

  function updateComponentProps(id: string, props: Record<string, unknown>) {
    pushHistory()
    components.value = components.value.map((c) =>
      c.id === id ? { ...c, props: { ...c.props, ...props } } : c,
    )
  }

  function replaceComponentProps(id: string, props: Record<string, unknown>) {
    pushHistory()
    components.value = components.value.map((c) =>
      c.id === id ? { ...c, props: { ...props } } : c,
    )
  }

  function moveComponent(id: string, x: number, y: number) {
    pushHistory()
    components.value = components.value.map((c) => (c.id === id ? { ...c, x, y } : c))
  }

  function moveComponents(ids: string[], dx: number, dy: number) {
    pushHistory()
    components.value = components.value.map((c) =>
      ids.includes(c.id) ? { ...c, x: Math.round(c.x + dx), y: Math.round(c.y + dy) } : c,
    )
  }

  function resizeComponent(id: string, x: number, y: number, w: number, h: number) {
    pushHistory()
    components.value = components.value.map((c) =>
      c.id === id ? { ...c, x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) } : c,
    )
  }

  function removeComponent(id: string) {
    pushHistory()
    components.value = components.value.filter((c) => c.id !== id)
    selectedIds.value = selectedIds.value.filter((x) => x !== id)
  }

  function removeComponents(ids: string[]) {
    pushHistory()
    components.value = components.value.filter((c) => !ids.includes(c.id))
    selectedIds.value = selectedIds.value.filter((x) => !ids.includes(x))
  }

  function bringToFront(id: string) {
    const idx = components.value.findIndex((c) => c.id === id)
    if (idx < 0) return
    const arr = [...components.value]
    const [item] = arr.splice(idx, 1)
    arr.push(item!)
    pushHistory()
    components.value = arr
  }

  function sendToBack(id: string) {
    const idx = components.value.findIndex((c) => c.id === id)
    if (idx < 0) return
    const arr = [...components.value]
    const [item] = arr.splice(idx, 1)
    arr.unshift(item!)
    pushHistory()
    components.value = arr
  }

  function bringForward(id: string) {
    const idx = components.value.findIndex((c) => c.id === id)
    if (idx < 0 || idx >= components.value.length - 1) return
    const arr = [...components.value]
    ;[arr[idx], arr[idx + 1]] = [arr[idx + 1]!, arr[idx]!]
    pushHistory()
    components.value = arr
  }

  function sendBackward(id: string) {
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
    if (selectedIds.value.length === 0) return
    clipboard.value = cloneComponentsByIds(components.value, selectedIds.value)
    pushHistory()
    components.value = components.value.filter((c) => !selectedIds.value.includes(c.id))
    selectedIds.value = []
  }

  function pasteComponents() {
    if (!clipboard.value || clipboard.value.length === 0) return
    pushHistory()
    const newComps = clipboard.value.map((c) => ({
      ...structuredClone(c),
      id: `comp-${nextId++}`,
      x: Math.round(c.x + PASTE_OFFSET),
      y: Math.round(c.y + PASTE_OFFSET),
    }))
    components.value = [...components.value, ...newComps]
    selectedIds.value = newComps.map((c) => c.id)
    clipboard.value = newComps.map((c) => structuredClone(c))
  }

  function setGroupDragOffset(offset: { dx: number; dy: number } | null) {
    groupDragOffset.value = offset
  }

  function setPageName(name: string) { pageName.value = name }
  function setPageSize(width: number, height: number) {
    const s = clampPageSize(width, height)
    pageWidth.value = s.width
    pageHeight.value = s.height
  }
  function setBgColor(color: string) { bgColor.value = color }
  function setBgGradient(gradient: BgGradient) { bgGradient.value = gradient }
  function setBgImage(url: string) { bgImage.value = url }
  function setBgOpacity(opacity: number) { bgOpacity.value = opacity }

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

  function importPageConfig(config: {
    dataSources?: DataSource[]
    colorDict?: ColorDictEntry[]
    iconDict?: IconDictEntry[]
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
    if (config.abbrevDict !== undefined) {
      abbrevDict.value = config.abbrevDict.map((entry) => ({ ...entry, id: `ad-${nextAbbrevDictId++}` }))
    }
  }

  function loadPage(pId: number, name: string, schema: PageSchema) {
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
    pageName.value = name
    pageWidth.value = w
    pageHeight.value = h
    bgColor.value = schema.bgColor ?? '#0d1520'
    bgGradient.value = schema.bgGradient ?? 'none'
    bgImage.value = schema.bgImage ?? ''
    bgOpacity.value = schema.bgOpacity ?? 1
    dataSources.value = schema.dataSources ?? []
    colorDict.value = migrated
    iconDict.value = migratedIcon
    abbrevDict.value = migratedAbbrev
    components.value = comps
    selectedIds.value = []
    clipboard.value = null
    past.value = []
    future.value = []
  }

  function toSchema(): PageSchema {
    return {
      width: pageWidth.value,
      height: pageHeight.value,
      bgColor: bgColor.value,
      bgGradient: bgGradient.value,
      bgImage: bgImage.value || undefined,
      bgOpacity: bgOpacity.value,
      dataSources: dataSources.value,
      colorDict: colorDict.value.length > 0 ? colorDict.value : undefined,
      iconDict: iconDict.value.length > 0 ? iconDict.value : undefined,
      abbrevDict: abbrevDict.value.length > 0 ? abbrevDict.value : undefined,
      components: components.value,
    }
  }

  return {
    // state
    components, selectedIds, pageId, pageName, pageWidth, pageHeight,
    bgColor, bgGradient, bgImage, bgOpacity,
    dataSources, colorDict, iconDict, abbrevDict,
    past, future, groupDragOffset, clipboard,
    // computed
    firstSelectedId, canUndo, canRedo, canCopy, canPaste, canMoveUp, canMoveDown,
    // actions
    undo, redo,
    selectComponent, selectComponents,
    addComponent, updateComponentProps, replaceComponentProps,
    moveComponent, moveComponents, resizeComponent,
    removeComponent, removeComponents,
    bringToFront, sendToBack, bringForward, sendBackward,
    copySelectedComponents, cutSelectedComponents, pasteComponents,
    setGroupDragOffset,
    setPageName, setPageSize, setBgColor, setBgGradient, setBgImage, setBgOpacity,
    addDataSource, updateDataSource, removeDataSource, setComponentDataSource,
    addColorDictEntry, updateColorDictEntry, removeColorDictEntry,
    addIconDictEntry, updateIconDictEntry, removeIconDictEntry,
    addAbbrevDictEntry, updateAbbrevDictEntry, removeAbbrevDictEntry,
    importPageConfig,
    loadPage, toSchema,
  }
})
