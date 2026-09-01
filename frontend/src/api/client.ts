// All API types mirror the Pydantic schemas from the backend

export interface Tank {
  id: string
  name: string
  volume_litres: number
  water_type: string
  shape: 'rectangle' | 'cylinder'
  substrate: string | null
  lighting: string | null
  has_filter: boolean
  filter_flow_lph: number | null
  width_mm: number | null
  height_mm: number | null
  depth_mm: number | null
  co2_injection: boolean
  co2_source: string | null
  co2_method: string | null
  has_heater: boolean
  heater_watts: number | null
  has_lighting: boolean
  light_intensity: string | null
  light_watts: number | null
  light_technology: string | null
  setup_date: string | null
  created_at: string
  owner_id: string
  my_access: 'owner' | 'edit' | 'view'
}

export interface TankShare {
  user_id: string
  email: string
  display_name: string | null
  level: 'view' | 'edit'
}

export function canEditTank(tank: Pick<Tank, 'my_access'>): boolean {
  return tank.my_access === 'owner' || tank.my_access === 'edit'
}

export function isTankOwner(tank: Pick<Tank, 'my_access'>): boolean {
  return tank.my_access === 'owner'
}

export interface Expense {
  id: string
  tank_id: string | null
  inventory_item_id: string | null
  amount: number
  quantity: number
  category: string
  description: string | null
  purchase_date: string
  notes: string | null
  created_at: string
}

export interface InventoryItem {
  id: string
  name: string
  category: 'Equipment' | 'Plants' | 'Food' | 'Chemicals' | 'Medication' | 'Decor' | 'Tanks' | 'Other'
  quantity: number
  low_stock_threshold: number
  unit_label: string | null
  notes: string | null
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
  food_types: string | null
  feeding_times_per_day: number | null
  feeding_amount: string | null
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

export interface TapWaterTest {
  id: string
  ph: number | null
  gh_dgh: number | null
  kh_dkh: number | null
  chlorine_ppm: number | null
  nitrate_ppm: number | null
  tds_ppm: number | null
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
  is_recurring: boolean
  recur_every_weeks: number | null
  recur_day_of_week: number | null
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
  case_id: string | null
  event_type: string
  notes: string
  occurred_at: string
  created_at: string
  common_name: string | null
  species_slug: string | null
}

export interface HealthCase {
  id: string
  tank_id: string
  tank_fish_id: string | null
  title: string
  status: string
  started_at: string
  treatment: string | null
  resolved_at: string | null
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

export interface RoomTankPosition {
  tank_id: string
  x: number
  y: number
}

export interface Room {
  id: string
  name: string
  width_m: number
  length_m: number
  tank_positions: RoomTankPosition[]
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

export interface AgentSettings {
  provider: 'anthropic' | 'openai' | 'ollama' | null
  model: string | null
  base_url: string | null
  api_key_set: boolean
  updated_at: string
}

export interface AgentSettingsUpdate {
  provider?: 'anthropic' | 'openai' | 'ollama'
  model?: string
  base_url?: string | null
  api_key?: string | null
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface Conversation {
  id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface ConversationDetail extends Conversation {
  messages: (ChatMessage & { created_at: string })[]
}

export type PermissionLevel = 'none' | 'use' | 'edit' | 'delete'

export interface ExportSelection {
  tanks: boolean
  tank_fish: boolean
  tank_plants: boolean
  tank_parameters: boolean
  tank_maintenance: boolean
  tank_daily_tasks: boolean
  tank_alerts: boolean
  tank_journal: boolean
  tank_health_cases: boolean
  rooms: boolean
  expenses: boolean
  inventory: boolean
  tap_water: boolean
  settings: boolean
}

export interface DashboardSectionLayout {
  id: string
  visible: boolean
}

export interface AuthUser {
  id: string
  email: string
  display_name: string | null
  has_password: boolean
  permissions: Record<string, PermissionLevel>
  date_format: string
  unit_system: string
  default_tank_id: string | null
  notifications_enabled: boolean
  dashboard_layout: DashboardSectionLayout[]
  dashboard_stats: string[]
}

const PERMISSION_LEVEL_RANK: Record<PermissionLevel, number> = { none: 0, use: 1, edit: 2, delete: 3 }

export function hasPermission(level: PermissionLevel | string | undefined, required: PermissionLevel): boolean {
  return (PERMISSION_LEVEL_RANK[(level as PermissionLevel) ?? 'none'] ?? 0) >= PERMISSION_LEVEL_RANK[required]
}

export function hasAnyPermission(permissions: Record<string, PermissionLevel> | undefined, required: PermissionLevel): boolean {
  return Object.values(permissions ?? {}).some(level => hasPermission(level, required))
}

export interface AuthConfig {
  allow_registration_effective: boolean
  oidc_enabled: boolean
  oidc_label: string | null
}

export interface AuthSettings {
  allow_registration: boolean
  oidc_issuer_url: string | null
  oidc_client_id: string | null
  oidc_client_secret_set: boolean
  oidc_display_name: string | null
  updated_at: string
}

export interface AuthSettingsUpdate {
  allow_registration?: boolean
  oidc_issuer_url?: string | null
  oidc_client_id?: string | null
  oidc_client_secret?: string | null
  oidc_display_name?: string | null
}

export interface UserListItem {
  id: string
  email: string
  display_name: string | null
  has_password: boolean
  has_oidc: boolean
  created_at: string
  last_login_at: string | null
}

// --- Fetch helpers ---

const BASE = '/api'

// A 401 from any already-authenticated route means the session has expired or
// been logged out elsewhere — reload so AuthProvider's mount check picks it up
// and falls back to the login screen. /auth/* itself legitimately returns 401
// for a wrong password, which callers need to catch and display, not reload past.
function handleUnauthorized(path: string) {
  if (!path.startsWith('/auth/')) window.location.reload()
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`)
  if (res.status === 401) handleUnauthorized(path)
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`)
  return res.json()
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 401) handleUnauthorized(path)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).detail ?? `POST ${path} failed: ${res.status}`)
  }
  return res.json()
}

async function put<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 401) handleUnauthorized(path)
  if (!res.ok) throw new Error(`PUT ${path} failed: ${res.status}`)
  return res.json()
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) handleUnauthorized(path)
  if (!res.ok) throw new Error(`PATCH ${path} failed: ${res.status}`)
  return res.json()
}

async function del(path: string, body?: unknown): Promise<void> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'DELETE',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  if (res.status === 401) handleUnauthorized(path)
  if (!res.ok) throw new Error(`DELETE ${path} failed: ${res.status}`)
}

// Auth endpoints surface a meaningful `detail` message (e.g. "Incorrect email
// or password") that the login/register forms need to show, unlike the
// generic helpers above which just throw a status code.
async function authPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as any).detail ?? `Request failed: ${res.status}`)
  }
  return res.status === 204 ? (undefined as T) : res.json()
}

// --- API surface ---

export const api = {
  tanks: {
    list: () => get<Tank[]>('/tanks/'),
    get: (id: string) => get<Tank>(`/tanks/${id}`),
    create: (body: Omit<Tank, 'id' | 'created_at' | 'owner_id' | 'my_access'>) => post<Tank>('/tanks/', body),
    update: (id: string, body: Partial<Omit<Tank, 'id' | 'created_at' | 'owner_id' | 'my_access'>>) => patch<Tank>(`/tanks/${id}`, body),
    delete: (id: string) => del(`/tanks/${id}`),
    reorder: (order: { id: string; sort_order: number }[]) => patch<{ ok: boolean }>('/tanks/reorder', order),
    listShares: (id: string) => get<TankShare[]>(`/tanks/${id}/shares`),
    addShare: (id: string, body: { email: string; level: 'view' | 'edit' }) => post<TankShare>(`/tanks/${id}/shares`, body),
    removeShare: (id: string, userId: string) => del(`/tanks/${id}/shares/${userId}`),
  },
  fish: {
    list: (tankId: string) => get<TankFish[]>(`/fish/${tankId}/fish`),
    add: (tankId: string, body: Pick<TankFish, 'species_slug' | 'quantity' | 'organism_type' | 'fish_status' | 'notes'>) =>
      post<TankFish>(`/fish/${tankId}/fish`, body),
    update: (tankId: string, fishId: string, body: { quantity?: number; organism_type?: string; fish_status?: string; health_status?: string; food_types?: string | null; feeding_times_per_day?: number | null; feeding_amount?: string | null; notes?: string | null }) =>
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
  tapWater: {
    list: (limit = 50) => get<TapWaterTest[]>(`/tap-water/?limit=${limit}`),
    log: (body: Omit<TapWaterTest, 'id' | 'recorded_at'>) => post<TapWaterTest>('/tap-water/', body),
  },
  alerts: {
    list: (tankId: string, unacknowledgedOnly = false) =>
      get<Alert[]>(`/alerts/${tankId}/alerts?unacknowledged_only=${unacknowledgedOnly}`),
    acknowledge: (tankId: string, alertId: string) =>
      patch<Alert>(`/alerts/${tankId}/alerts/${alertId}/acknowledge`),
    delete: (tankId: string, alertId: string) =>
      del(`/alerts/${tankId}/alerts/${alertId}`),
  },
  maintenance: {
    list: (tankId: string) => get<MaintenanceTask[]>(`/tanks/${tankId}/maintenance`),
    create: (tankId: string, body: Pick<MaintenanceTask, 'task_type' | 'description' | 'due_at'>) =>
      post<MaintenanceTask>(`/tanks/${tankId}/maintenance`, body),
    complete: (tankId: string, taskId: string) =>
      patch<MaintenanceTask>(`/tanks/${tankId}/maintenance/${taskId}/complete`),
    updateCompletedDate: (tankId: string, taskId: string, completedAt: string) =>
      patch<MaintenanceTask>(`/tanks/${tankId}/maintenance/${taskId}/completed-date`, { completed_at: completedAt }),
    skip: (tankId: string, taskId: string, times: number) =>
      patch<MaintenanceTask>(`/tanks/${tankId}/maintenance/${taskId}/skip`, { times }),
    postpone: (tankId: string, taskId: string, dueAt: string) =>
      patch<MaintenanceTask>(`/tanks/${tankId}/maintenance/${taskId}/postpone`, { due_at: dueAt }),
    delete: (tankId: string, taskId: string) => del(`/tanks/${tankId}/maintenance/${taskId}`),
  },
  dailyTasks: {
    list: (tankId: string) => get<DailyTask[]>(`/tanks/${tankId}/daily`),
    create: (tankId: string, body: Omit<DailyTask, 'id' | 'tank_id'>) =>
      post<DailyTask>(`/tanks/${tankId}/daily`, body),
    update: (tankId: string, taskId: string, body: Partial<Omit<DailyTask, 'id' | 'tank_id'>>) =>
      patch<DailyTask>(`/tanks/${tankId}/daily/${taskId}`, body),
    delete: (tankId: string, taskId: string) => del(`/tanks/${tankId}/daily/${taskId}`),
  },
  backup: {
    export: (selection: ExportSelection) => post<unknown>('/backup/export', selection),
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
    add: (tankId: string, body: { tank_fish_id?: string | null; case_id?: string | null; event_type: string; notes: string; occurred_at?: string }) =>
      post<JournalEntry>(`/tanks/${tankId}/journal`, body),
    update: (tankId: string, entryId: string, body: { tank_fish_id?: string | null; case_id?: string | null; event_type?: string; notes?: string; occurred_at?: string }) =>
      patch<JournalEntry>(`/tanks/${tankId}/journal/${entryId}`, body),
    delete: (tankId: string, entryId: string) => del(`/tanks/${tankId}/journal/${entryId}`),
  },
  healthCases: {
    list: (tankId: string) => get<HealthCase[]>(`/tanks/${tankId}/health-cases`),
    add: (tankId: string, body: { tank_fish_id?: string | null; title: string; started_at?: string; treatment?: string | null }) =>
      post<HealthCase>(`/tanks/${tankId}/health-cases`, body),
    update: (tankId: string, caseId: string, body: { tank_fish_id?: string | null; title?: string; status?: string; started_at?: string; treatment?: string | null }) =>
      patch<HealthCase>(`/tanks/${tankId}/health-cases/${caseId}`, body),
    delete: (tankId: string, caseId: string) => del(`/tanks/${tankId}/health-cases/${caseId}`),
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
    remove: (slug: string) => del(`/species/${slug}`),
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
  spending: {
    list: (tankId?: string) => get<Expense[]>(`/expenses${tankId ? `?tank_id=${tankId}` : ''}`),
    add: (body: Pick<Expense, 'tank_id' | 'amount' | 'quantity' | 'category' | 'description' | 'purchase_date' | 'notes'>) =>
      post<Expense>('/expenses', body),
    update: (id: string, body: Partial<Pick<Expense, 'tank_id' | 'amount' | 'quantity' | 'category' | 'description' | 'purchase_date' | 'notes'>>) =>
      patch<Expense>(`/expenses/${id}`, body),
    remove: (id: string) => del(`/expenses/${id}`),
  },
  inventory: {
    list: () => get<InventoryItem[]>('/inventory/'),
    create: (body: Pick<InventoryItem, 'name' | 'category' | 'quantity' | 'low_stock_threshold' | 'unit_label' | 'notes'>) =>
      post<InventoryItem>('/inventory/', body),
    update: (id: string, body: Partial<Pick<InventoryItem, 'name' | 'category' | 'low_stock_threshold' | 'unit_label' | 'notes'>>) =>
      patch<InventoryItem>(`/inventory/${id}`, body),
    remove: (id: string) => del(`/inventory/${id}`),
    adjust: (id: string, delta: number) => patch<InventoryItem>(`/inventory/${id}/adjust`, { delta }),
    restock: (id: string, body: { quantity: number; amount?: number | null; purchase_date?: string | null }) =>
      post<InventoryItem>(`/inventory/${id}/restock`, body),
  },
  rooms: {
    list: () => get<Room[]>('/rooms/'),
    create: (body: { name: string; width_m?: number; length_m?: number }) =>
      post<Room>('/rooms/', body),
    update: (id: string, body: Partial<{ name: string; width_m: number; length_m: number }>) =>
      patch<Room>(`/rooms/${id}`, body),
    remove: (id: string) => del(`/rooms/${id}`),
    setTankPosition: (tankId: string, body: { room_id: string; x: number; y: number }) =>
      put<RoomTankPosition>(`/rooms/tank-positions/${tankId}`, body),
    unassignTank: (tankId: string) => del(`/rooms/tank-positions/${tankId}`),
  },
  agent: {
    getSettings: () => get<AgentSettings>('/agent/settings'),
    updateSettings: (body: AgentSettingsUpdate) => put<AgentSettings>('/agent/settings', body),
    listConversations: () => get<Conversation[]>('/agent/conversations'),
    getConversation: (id: string) => get<ConversationDetail>(`/agent/conversations/${id}`),
    deleteConversation: (id: string) => del(`/agent/conversations/${id}`),
    chat: async (message: string, conversationId?: string | null): Promise<{ conversation_id: string; reply: string }> => {
      const res = await fetch(`${BASE}/agent/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversation_id: conversationId ?? null }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).detail ?? `Chat failed: ${res.status}`)
      }
      return res.json()
    },
    draftSpecies: async (name: string): Promise<SpeciesBody> => {
      const res = await fetch(`${BASE}/agent/species-draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as any).detail ?? `Draft failed: ${res.status}`)
      }
      return res.json()
    },
  },
  auth: {
    config: () => get<AuthConfig>('/auth/config'),
    me: () => get<AuthUser>('/auth/me'),
    register: (body: { email: string; password: string; display_name?: string }) =>
      authPost<AuthUser>('/auth/register', body),
    login: (body: { email: string; password: string }) => authPost<AuthUser>('/auth/login', body),
    logout: () => authPost<void>('/auth/logout', {}),
    changePassword: (body: { current_password?: string; new_password: string }) =>
      authPost<AuthUser>('/auth/change-password', body),
    updateProfile: (body: { date_format?: string; unit_system?: string; default_tank_id?: string | null; notifications_enabled?: boolean; dashboard_layout?: DashboardSectionLayout[]; dashboard_stats?: string[] }) =>
      patch<AuthUser>('/auth/me', body),
    getSettings: () => get<AuthSettings>('/auth/settings'),
    updateSettings: (body: AuthSettingsUpdate) => patch<AuthSettings>('/auth/settings', body),
    listUsers: () => get<UserListItem[]>('/auth/users'),
    updateUser: (id: string, body: { email?: string; display_name?: string | null }) =>
      patch<UserListItem>(`/auth/users/${id}`, body),
    deleteUser: (id: string) => del(`/auth/users/${id}`),
    getPermissions: (id: string) => get<Record<string, PermissionLevel>>(`/auth/users/${id}/permissions`),
    updatePermissions: (id: string, body: Partial<Record<string, PermissionLevel>>) =>
      put<Record<string, PermissionLevel>>(`/auth/users/${id}/permissions`, body),
  },
  push: {
    getVapidPublicKey: () => get<{ public_key: string }>('/push/vapid-public-key'),
    subscribe: (body: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
      post<{ ok: boolean }>('/push/subscribe', body),
    unsubscribe: (endpoint: string) => del('/push/subscribe', { endpoint }),
  },
}
