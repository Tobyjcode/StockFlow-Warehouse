type JsonBody = Record<string, unknown>

async function requestJson<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(url, options)

  if (!res.ok) {
    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = (await res.json()) as { title?: string; detail?: string }
      throw new Error(body.detail ?? body.title ?? `Request failed: ${res.status}`)
    }

    const bodyText = await res.text()
    throw new Error(bodyText || `Request failed: ${res.status}`)
  }

  if (res.status === 204) {
    return undefined as T
  }

  return res.json() as Promise<T>
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