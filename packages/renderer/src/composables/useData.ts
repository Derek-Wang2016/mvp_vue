import { ref, computed, provide, inject, onBeforeUnmount, onMounted, watch, type Ref, type InjectionKey, type ComputedRef } from 'vue'
import type { DataSource } from '@mvp-vue/schema'
import { resolveRestDataSourceUrl } from '@mvp-vue/schema'
import { getApiBase } from '../config'

export interface DataState {
  data: unknown | null
  loading: boolean
  error: string | null
}

export interface DataStateRefs {
  data: ComputedRef<unknown | null>
  loading: ComputedRef<boolean>
  error: ComputedRef<string | null>
}

type DataMap = Record<string, DataState>

export const DATA_MAP_KEY: InjectionKey<Ref<DataMap>> = Symbol('dataMap')

const EMPTY: DataStateRefs = {
  data: computed(() => null),
  loading: computed(() => false),
  error: computed(() => null),
}

export function useData(dsId?: string): DataStateRefs {
  const map = inject(DATA_MAP_KEY)
  if (!dsId) return EMPTY
  if (!map) {
    return {
      data: computed(() => null),
      loading: computed(() => false),
      error: computed(() => 'DataSource not found'),
    }
  }
  return {
    data: computed(() => map.value[dsId]?.data ?? null),
    loading: computed(() => map.value[dsId]?.loading ?? false),
    error: computed(() => {
      if (!(dsId in map.value)) return 'DataSource not found'
      return map.value[dsId]?.error ?? null
    }),
  }
}

function buildInitialMap(dataSources: DataSource[]): DataMap {
  const init: DataMap = {}
  for (const ds of dataSources) {
    init[ds.id] = { data: null, loading: true, error: null }
  }
  return init
}

/** 在 DataProvider 内调用：注册 dataMap、拉取数据源，并返回 dispose */
export function useProvideDataSources(
  getDataSources: () => DataSource[],
  getPageSearchParams: () => URLSearchParams = () => new URLSearchParams(window.location.search),
) {
  const dataMap = ref<DataMap>(buildInitialMap(getDataSources()))
  let generation = 0
  const timers = new Map<string, ReturnType<typeof setInterval>>()

  function dispose() {
    generation++
    timers.forEach((t) => clearInterval(t))
    timers.clear()
  }

  async function fetchData(ds: DataSource) {
    const gen = generation
    const prev = dataMap.value[ds.id]
    const hasPrevData = prev?.data != null
    dataMap.value = {
      ...dataMap.value,
      // 有历史数据时采用静默刷新：保留当前展示，避免刷新闪烁
      [ds.id]: {
        data: hasPrevData ? prev!.data : null,
        loading: hasPrevData ? false : true,
        error: null,
      },
    }
    try {
      let result: unknown
      if (ds.type === 'static') {
        result = ds.staticData
      } else if (ds.type === 'sql') {
        const res = await fetch(`${getApiBase()}/api/query`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: ds.query }),
        })
        if (!res.ok) throw new Error(`Query error: ${res.status}`)
        const json = await res.json()
        result = json.data
      } else {
        const requestUrl = resolveRestDataSourceUrl(ds, getPageSearchParams()) ?? ds.url
        const res = await fetch(`${getApiBase()}/api/data-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: requestUrl,
            method: ds.method,
            headers: ds.headers,
            dataPath: ds.dataPath,
          }),
        })
        if (!res.ok) throw new Error(`Proxy error: ${res.status}`)
        const json = await res.json()
        result = json.data
      }
      if (gen !== generation) return
      dataMap.value = { ...dataMap.value, [ds.id]: { data: result, loading: false, error: null } }
    } catch (err: unknown) {
      if (gen !== generation) return
      const message = err instanceof Error ? err.message : String(err)
      const current = dataMap.value[ds.id]
      const keepData = current?.data ?? null
      dataMap.value = {
        ...dataMap.value,
        [ds.id]: {
          data: keepData,
          loading: false,
          // 若已有可展示数据，则不打断渲染面板，仅在无数据时暴露错误态
          error: keepData != null ? null : message,
        },
      }
    }
  }

  function load(dataSources: DataSource[]) {
    dispose()
    dataMap.value = buildInitialMap(dataSources)
    for (const ds of dataSources) {
      void fetchData(ds)
      if (ds.refreshInterval && ds.refreshInterval > 0) {
        const timer = setInterval(() => void fetchData(ds), ds.refreshInterval * 1000)
        timers.set(ds.id, timer)
      }
    }
  }

  provide(DATA_MAP_KEY, dataMap)

  watch(getDataSources, (sources) => load(sources), { deep: true })

  function onPopState() {
    load(getDataSources())
  }

  onMounted(() => {
    window.addEventListener('popstate', onPopState)
  })

  onBeforeUnmount(() => {
    window.removeEventListener('popstate', onPopState)
    dispose()
  })

  load(getDataSources())

  return { dispose, dataMap }
}
