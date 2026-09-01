// General fishkeeping guideline ranges used to colour-code water parameter readings.
// idealMin/idealMax = healthy range (green); okMin/okMax = borderline (amber); outside = danger (red).
export type ParamRange = { idealMin: number; idealMax: number; okMin: number; okMax: number }

export function getParamRange(key: string, waterType: string): ParamRange | null {
  const marine = waterType !== 'freshwater'
  switch (key) {
    case 'ph': return marine
      ? { idealMin: 8.0, idealMax: 8.4, okMin: 7.8, okMax: 8.6 }
      : { idealMin: 6.5, idealMax: 7.5, okMin: 6.0, okMax: 8.0 }
    case 'temperature_c': return { idealMin: 23, idealMax: 27, okMin: 20, okMax: 30 }
    case 'ammonia_ppm': return { idealMin: 0, idealMax: 0, okMin: 0, okMax: 0.25 }
    case 'nitrite_ppm': return { idealMin: 0, idealMax: 0, okMin: 0, okMax: 0.5 }
    case 'nitrate_ppm': return marine
      ? { idealMin: 0, idealMax: 5, okMin: 0, okMax: 20 }
      : { idealMin: 0, idealMax: 20, okMin: 0, okMax: 40 }
    case 'gh_dgh': return { idealMin: 4, idealMax: 12, okMin: 2, okMax: 20 }
    case 'kh_dkh': return { idealMin: 3, idealMax: 8, okMin: 1, okMax: 12 }
    case 'salinity_ppt': return { idealMin: 32, idealMax: 35, okMin: 28, okMax: 38 }
    case 'specific_gravity': return { idealMin: 1.023, idealMax: 1.025, okMin: 1.020, okMax: 1.026 }
    default: return null
  }
}

export type ParamStatus = 'ideal' | 'ok' | 'bad'

export function getParamStatus(key: string, value: number, waterType: string): ParamStatus | null {
  const r = getParamRange(key, waterType)
  if (!r) return null
  if (value >= r.idealMin && value <= r.idealMax) return 'ideal'
  if (value >= r.okMin && value <= r.okMax) return 'ok'
  return 'bad'
}

export const PARAM_STATUS_COLORS: Record<ParamStatus, { bg: string; color: string; border: string }> = {
  ideal: { bg: 'var(--green-bg)', color: 'var(--green)', border: 'var(--green-border)' },
  ok:    { bg: 'var(--amber-bg)', color: 'var(--amber)', border: 'var(--amber-border)' },
  bad:   { bg: 'var(--red-bg)',   color: 'var(--red)',   border: 'var(--red-border)' },
}
