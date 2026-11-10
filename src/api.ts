const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

export type ApiProgramme = {
  id: number
  name: string
  slug: string
  award: string
  category: 'Business' | 'Communication' | 'Technology'
  duration_years: number
  description: string
  entry_requirements: string | null
}

export type Paginated<T> = {
  data: T[]
  current_page: number
  last_page: number
  total: number
}

type ApiOptions = Omit<RequestInit, 'body'> & {
  body?: Record<string, unknown>
  formData?: FormData
  token?: string
}

export async function apiRequest<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, formData, headers, token, ...requestOptions } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...requestOptions,
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(formData ? { body: formData } : body ? { body: JSON.stringify(body) } : {}),
  })

  const result: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const payload = result as { message?: string; errors?: Record<string, string[]> } | null
    const validationMessage = payload?.errors
      ? Object.values(payload.errors).flat()[0]
      : undefined
    throw new Error(validationMessage ?? payload?.message ?? `Request failed (${response.status}).`)
  }

  return result as T
}

export async function downloadProtectedFile(path: string, token: string, filename: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { Accept: 'application/octet-stream', Authorization: `Bearer ${token}` },
  })

  if (!response.ok) {
    const result = await response.json().catch(() => null) as { message?: string } | null
    throw new Error(result?.message ?? `Download failed (${response.status}).`)
  }

  const objectUrl = URL.createObjectURL(await response.blob())
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(objectUrl)
}
