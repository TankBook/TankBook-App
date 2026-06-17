import { useState, useEffect, useCallback } from 'react'
import { api, Tank, TankFish, TankPlant, WaterParameter, Alert } from '../api/client'

function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setData(await fetcher())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => { load() }, [load])
  return { data, loading, error, reload: load }
}

export function useTanks() {
  return useFetch<Tank[]>(() => api.tanks.list())
}

export function useTank(id: string) {
  return useFetch<Tank>(() => api.tanks.get(id), [id])
}

export function useFish(tankId: string) {
  return useFetch<TankFish[]>(() => api.fish.list(tankId), [tankId])
}

export function usePlants(tankId: string) {
  return useFetch<TankPlant[]>(() => api.plants.list(tankId), [tankId])
}

export function useParameters(tankId: string, limit = 50) {
  return useFetch<WaterParameter[]>(() => api.parameters.list(tankId, limit), [tankId, limit])
}

export function useAlerts(tankId: string, unacknowledgedOnly = false) {
  return useFetch<Alert[]>(() => api.alerts.list(tankId, unacknowledgedOnly), [tankId, unacknowledgedOnly])
}
