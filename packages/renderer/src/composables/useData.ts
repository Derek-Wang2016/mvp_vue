import { ref, computed, provide, inject, onBeforeUnmount, type Ref, type InjectionKey, type ComputedRef } from 'vue'
import type { DataSource } from '@mvp-vue/schema'
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

export function provideDataSources(dataSources: DataSource[]) {
  const init: DataMap = {}
  for (const ds of dataSources) {
    init[ds.id] = { data: null, loading: true, error: null }
  }
  const dataMap = ref<DataMap>(init)

  const timers = new Map<string, ReturnType<typeof setInterval>>()

  async function fetchData(ds: DataSource) {
    dataMap.value = {
      ...dataMap.value,
      [ds.id]: { data: dataMap.value[ds.id]?.data ?? null, loading: dataMap.value[ds.id]?.data == null, error: null },
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
        const res = await fetch(`${getApiBase()}/api/data-proxy`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: ds.url,
            method: ds.method,
            headers: ds.headers,
            dataPath: ds.dataPath,
          }),
        })
        if (!res.ok) throw new Error(`Proxy error: ${res.status}`)
        const json = await res.json()
        result = json.data
      }
      dataMap.value = { ...dataMap.value, [ds.id]: { data: result, loading: false, error: null } }
    } catch (err: any) {
      dataMap.value = { ...dataMap.value, [ds.id]: { data: null, loading: false, error: err.message } }
    }
  }

  for (const ds of dataSources) {
    fetchData(ds)
    if (ds.refreshInterval && ds.refreshInterval > 0) {
      const timer = setInterval(() => fetchData(ds), ds.refreshInterval * 1000)
      timers.set(ds.id, timer)
    }
  }

  onBeforeUnmount(() => {
    timers.forEach((t) => clearInterval(t))
  })

  provide(DATA_MAP_KEY, dataMap)
}
