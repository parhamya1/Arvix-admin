import type { KpiDefinition, KpiDefinitionPayload, KpiListItem } from './kpiTypes'

const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

const parseResponse = async <T>(res: Response): Promise<T> => {
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { message?: string } | null
    throw new Error(body?.message ?? 'Request failed')
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const listKpis = async () =>
  parseResponse<KpiListItem[]>(await fetch(`${backendBaseUrl}/api/kpis`))

export const getKpi = async (id: string) =>
  parseResponse<KpiDefinition>(await fetch(`${backendBaseUrl}/api/kpis/${id}`))

export const createKpi = async (payload: KpiDefinitionPayload) =>
  parseResponse<{ id: string }>(
    await fetch(`${backendBaseUrl}/api/kpis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  )

export const updateKpi = async (id: string, payload: KpiDefinitionPayload) =>
  parseResponse<{ ok: true }>(
    await fetch(`${backendBaseUrl}/api/kpis/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
  )

export const deleteKpi = async (id: string) =>
  parseResponse<void>(await fetch(`${backendBaseUrl}/api/kpis/${id}`, { method: 'DELETE' }))

export const duplicateKpi = async (id: string) =>
  parseResponse<{ id: string; name: string }>(
    await fetch(`${backendBaseUrl}/api/kpis/${id}/duplicate`, { method: 'POST' })
  )

export const setKpiActive = async (id: string, isActive: boolean) =>
  parseResponse<{ ok: true }>(
    await fetch(`${backendBaseUrl}/api/kpis/${id}/active`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive }),
    })
  )
