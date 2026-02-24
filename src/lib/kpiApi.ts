const backendBaseUrl = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:4000'

type KpiListItem = {
  id: string
  name: string
  createdAt: string
  updatedAt: string
}

type KpiDefinition = {
  id: string
  name: string
  payload: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

type KpiUpsertPayload = {
  name: string
  payload: Record<string, unknown>
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${backendBaseUrl}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    ...init,
  })

  if (response.status === 204) {
    return undefined as T
  }

  const data = (await response.json().catch(() => ({}))) as { message?: string } & T

  if (!response.ok) {
    throw new Error(data?.message || `Request failed with status ${response.status}`)
  }

  return data as T
}

export const listKpis = () => request<KpiListItem[]>('/api/kpis')

export const getKpi = (id: string) => request<KpiDefinition>(`/api/kpis/${id}`)

export const createKpi = (data: KpiUpsertPayload) =>
  request<{ id: string }>('/api/kpis', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateKpi = (id: string, data: KpiUpsertPayload) =>
  request<{ ok: boolean }>(`/api/kpis/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const deleteKpi = (id: string) =>
  request<void>(`/api/kpis/${id}`, {
    method: 'DELETE',
  })

export type { KpiDefinition, KpiListItem, KpiUpsertPayload }
