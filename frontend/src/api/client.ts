// All API types mirror the Pydantic schemas from the backend

export interface Tank {
  id: string
  name: string
  volume_litres: number
  water_type: string
  substrate: string | null
  lighting: string | null
  filter_flow_lph: number | null
  width_mm: number | null
  height_mm: number | null
  depth_mm: number | null
  co2_injection: boolean
  setup_date: string | null
  created_at: string
}

export interface TankFish {
  id: string
  tank_id: string
  species_slug: string
  quantity: number
  organism_type: string
  fish_status: string
  health_status: string
  added_at: string
  notes: string | null
  common_name: string | null
  latin_name: string | null
}

export interface TankPlant {
  id: string
  tank_id: string
  species_slug: string
  quantity: number
  plant_status: string
  added_at: string
  notes: string | null
  common_name: string | null
  latin_name: string | null
}

export interface WaterParameter {
  id: string
  tank_id: string
  ph: number | null
  ammonia_ppm: number | null
  nitrite_ppm: number | null
  nitrate_ppm: number | null
  temperature_c: number | null
  gh_dgh: number | null
  kh_dkh: number | null
  salinity_ppt: number | null
  specific_gravity: number | null
  recorded_at: string
  notes: string | null
}

export interface MaintenanceTask {
  id: string
  tank_id: string
  task_type: string
  description: string | null
  due_at: string
  completed_at: string | null
  status: string
}

export interface DailyTask {
  id: string
  tank_id: string
  name: string
  hour: number
  minute: number
  days: string  // comma-separated 0=Mon…6=Sun
  color: string | null
}

export interface JournalEntry {
  id: string
  tank_id: string
  tank_fish_id: string | null
  event_type: string
  notes: string
  occurred_at: string
  created_at: string
  common_name: string | null
  species_slug: string | null
}

export interface SpeciesBody {
  slug: string
  common_name: string
  latin_name: string
  type: string
  family?: string
  origin?: string
  care?: {
    difficulty?: string
    min_tank_litres?: number
    shoal_min?: number
    group_min?: number
    max_size_cm?: number
    lifespan_years?: number
    growth_rate?: string
  }
  water?: {
    temp_c?: { min?: number; max?: number }
    ph?: { min?: number; max?: number }
    gh_dgh?: { min?: number; max?: number }
    kh_dkh?: { min?: number; max?: number }
  }
  compatibility?: { temperament?: string }
  light?: { requirement?: string }
  co2_required?: boolean
  notes?: string
}

export interface Alert {
  id: string
  tank_id: string
  parameter_log_id: string | null
  alert_type: string
  message: string
  severity: 'warning' | 'danger'
  acknowledged: boolean
  triggered_at: string
}

// --- Fetch helpers ---

const BASE = '/api'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} failed: ${res.status}`)
  return res.json()
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`)
  return res.json()
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`)
  return res.json()
}

async function del(path: string): Promise<void> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`)
}

// --- API surface ---

export const api = {
  tanks: {
    list: () => get<Tank[]>('/tanks/'),
    get: (id: string) => get<Tank>(`/tanks/${id}`),
    create: (body: Omit<Tank, 'id' | 'created_at'>) => post<Tank>('/tanks/', body),
    delete: (id: string) => del(`/tanks/${id}`),
  },
  fish: {
    list: (tankId: string) => get<TankFish[]>(`/fish/${tankId}/fish`),
    add: (tankId: string, body: Pick<TankFish, 'species_slug' | 'quantity' | 'organism_type' | 'fish_status' | 'notes'>) =>
      post<TankFish>(`/fish/${tankId}/fish`, body),
    update: (tankId: string, fishId: string, body: { quantity?: number; organism_type?: string; fish_status?: string; health_status?: string; notes?: string | null }) =>
      patch<TankFish>(`/fish/${tankId}/fish/${fishId}`, body),
    remove: (tankId: string, fishId: string) => del(`/fish/${tankId}/fish/${fishId}`),
  },
  plants: {
    list: (tankId: string) => get<TankPlant[]>(`/plants/${tankId}/plants`),
    add: (tankId: string, body: Pick<TankPlant, 'species_slug' | 'quantity' | 'notes' | 'plant_status'>) =>
      post<TankPlant>(`/plants/${tankId}/plants`, body),
    update: (tankId: string, plantId: string, body: { quantity?: number; plant_status?: string; notes?: string | null }) =>
      patch<TankPlant>(`/plants/${tankId}/plants/${plantId}`, body),
    remove: (tankId: string, plantId: string) => del(`/plants/${tankId}/plants/${plantId}`),
  },
  parameters: {
    list: (tankId: string, limit = 50) =>
      get<WaterParameter[]>(`/parameters/${tankId}/parameters?limit=${limit}`),
    log: (tankId: string, body: Omit<WaterParameter, 'id' | 'tank_id' | 'recorded_at'>) =>
      post<WaterParameter>(`/parameters/${tankId}/parameters`, body),
  },
  alerts: {
    list: (tankId: string, unacknowledgedOnly = false) =>
      get<Alert[]>(`/alerts/${tankId}/alerts?unacknowledged_only=${unacknowledgedOnly}`),
    acknowledge: (tankId: string, alertId: string) =>
      patch<Alert>(`/alerts/${tankId}/alerts/${alertId}/acknowledge`),
  },
  maintenance: {
    list: (tankId: string) => get<MaintenanceTask[]>(`/tanks/${tankId}/maintenance`),
    create: (tankId: string, body: Pick<MaintenanceTask, 'task_type' | 'description' | 'due_at'>) =>
      post<MaintenanceTask>(`/tanks/${tankId}/maintenance`, body),
    complete: (tankId: string, taskId: string) =>
      patch<MaintenanceTask>(`/tanks/${tankId}/maintenance/${taskId}/complete`),
    delete: (tankId: string, taskId: string) => del(`/tanks/${tankId}/maintenance/${taskId}`),
  },
  dailyTasks: {
    list: (tankId: string) => get<DailyTask[]>(`/tanks/${tankId}/daily`),
    create: (tankId: string, body: Omit<DailyTask, 'id' | 'tank_id'>) =>
      post<DailyTask>(`/tanks/${tankId}/daily`, body),
    delete: (tankId: string, taskId: string) => del(`/tanks/${tankId}/daily/${taskId}`),
  },
  backup: {
    export: () => get<unknown>('/backup/export'),
    import: async (data: unknown): Promise<{ ok: boolean; tanks_restored: number }> => {
      const res = await fetch(`${BASE}/backup/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).detail ?? 'Import failed')
      }
      return res.json()
    },
  },
  journal: {
    list: (tankId: string) => get<JournalEntry[]>(`/tanks/${tankId}/journal`),
    add: (tankId: string, body: { tank_fish_id?: string | null; event_type: string; notes: string; occurred_at?: string }) =>
      post<JournalEntry>(`/tanks/${tankId}/journal`, body),
    update: (tankId: string, entryId: string, body: { tank_fish_id?: string | null; event_type?: string; notes?: string; occurred_at?: string }) =>
      patch<JournalEntry>(`/tanks/${tankId}/journal/${entryId}`, body),
    delete: (tankId: string, entryId: string) => del(`/tanks/${tankId}/journal/${entryId}`),
  },
  images: {
    speciesUrl: (slug: string) => `/api/images/species/${slug}`,
    uploadSpecies: async (slug: string, file: File): Promise<{ ok: boolean; url: string }> => {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${BASE}/images/species/${slug}`, { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).detail ?? 'Upload failed')
      }
      return res.json()
    },
    fetchSpecies: async (slug: string, latinName: string): Promise<{ ok: boolean; url: string }> => {
      const res = await fetch(`${BASE}/images/species/${slug}/fetch?latin_name=${encodeURIComponent(latinName)}`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).detail ?? 'Fetch failed')
      }
      return res.json()
    },
    deleteSpecies: (slug: string) => del(`/images/species/${slug}`),
    tankList: (tankId: string) =>
      get<{ filename: string; url: string }[]>(`/images/tanks/${tankId}`),
    uploadTank: async (tankId: string, file: File): Promise<{ ok: boolean; filename: string; url: string }> => {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${BASE}/images/tanks/${tankId}`, { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).detail ?? 'Upload failed')
      }
      return res.json()
    },
    deleteTank: (tankId: string, filename: string) => del(`/images/tanks/${tankId}/${filename}`),
  },
  species: {
    create: (body: SpeciesBody) =>
      post<{ ok: boolean; slug: string; common_name: string; type: string }>('/species/create', body),
    update: (slug: string, body: SpeciesBody) =>
      put<{ ok: boolean; slug: string; common_name: string; type: string }>(`/species/${slug}`, body),
    upload: async (file: File): Promise<{ ok: boolean; slug: string; common_name: string; type: string }> => {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch(`${BASE}/species/upload`, { method: 'POST', body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? 'Upload failed')
      }
      return res.json()
    },
    uploadFromUrl: async (url: string): Promise<{ ok: boolean; slug: string; common_name: string; type: string }> => {
      const res = await fetch(`${BASE}/species/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.detail ?? 'Import failed')
      }
      return res.json()
    },
  },
}
