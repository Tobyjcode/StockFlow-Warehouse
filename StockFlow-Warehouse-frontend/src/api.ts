type JsonBody = Record<string, unknown>
const AUTH_TOKEN_KEY = 'stockflow.authToken'

export function setAuthToken(token: string) {
  localStorage.setItem(AUTH_TOKEN_KEY, token)
}

export function clearAuthToken() {
  localStorage.removeItem(AUTH_TOKEN_KEY)
}

export function getAuthToken(): string | null {
  return localStorage.getItem(AUTH_TOKEN_KEY)
}

async function requestJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getAuthToken()
  const headers = new Headers(options.headers)

  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(url, {
    ...options,
    headers,
  })

  const contentType = res.headers.get('content-type') ?? ''

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error('Unauthorized: please log in.')
    }

    if (res.status === 403) {
      throw new Error('Forbidden: you do not have permission.')
    }

    if (contentType.includes('application/json')) {
      const body = (await res.json()) as {
        title?: string
        detail?: string
        errors?: Record<string, string[]>
      }

      const validationError = body.errors
        ? Object.values(body.errors).flat().join(' ')
        : null

      throw new Error(validationError ?? body.detail ?? body.title ?? `Request failed: ${res.status}`)
    }

    const bodyText = await res.text()
    throw new Error(bodyText || `Request failed: ${res.status}`)
  }

  if (res.status === 204 || res.status === 205) {
    return undefined as T
  }

  const text = await res.text()
  if (!text.trim()) {
    return undefined as T
  }

  if (contentType.includes('application/json')) {
    return JSON.parse(text) as T
  }

  return text as T
}

export function getJson<T>(url: string): Promise<T> {
  return requestJson<T>(url)
}

export function postJson<TResponse>(
  url: string,
  body: JsonBody,
): Promise<TResponse> {
  return requestJson<TResponse>(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function putJson<TResponse>(
  url: string,
  body: JsonBody,
): Promise<TResponse> {
  return requestJson<TResponse>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

export function deleteJson(url: string): Promise<void> {
  return requestJson<void>(url, { method: 'DELETE' })
}