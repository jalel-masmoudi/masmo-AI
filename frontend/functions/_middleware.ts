interface Env {
  BACKEND_API_URL?: string
}

const API_PREFIXES = [
  '/investigate',
  '/investigation/',
  '/graph/',
  '/report/',
  '/voice/',
  '/health',
]

function isApiRoute(pathname: string): boolean {
  if (pathname === '/health') return true
  return API_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

async function proxyToBackend(
  request: Request,
  backendBase: string,
  pathname: string,
  search: string,
): Promise<Response> {
  const target = `${backendBase}${pathname}${search}`
  const headers = new Headers()

  const contentType = request.headers.get('Content-Type')
  if (contentType) headers.set('Content-Type', contentType)

  const accept = request.headers.get('Accept')
  if (accept) headers.set('Accept', accept)

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'

  return fetch(target, {
    method: request.method,
    headers,
    body: hasBody ? request.body : undefined,
    redirect: 'manual',
  })
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context
  const url = new URL(request.url)

  if (!isApiRoute(url.pathname)) {
    return next()
  }

  const backendBase = env.BACKEND_API_URL?.replace(/\/$/, '')
  if (!backendBase) {
    return new Response(
      JSON.stringify({
        detail: 'BACKEND_API_URL is not configured for this Pages deployment.',
      }),
      { status: 502, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Edge-cache only the health probe (safe, read-only).
  if (request.method === 'GET' && url.pathname === '/health') {
    const cache = caches.default
    const cacheKey = new Request(`${backendBase}/health`, { method: 'GET' })
    const cached = await cache.match(cacheKey)

    if (cached) {
      const headers = new Headers(cached.headers)
      headers.set('X-Masmo-Edge-Cache', 'HIT')
      return new Response(cached.body, { status: cached.status, headers })
    }

    const response = await proxyToBackend(
      request,
      backendBase,
      url.pathname,
      url.search,
    )
    const headers = new Headers(response.headers)
    headers.set('Cache-Control', 'public, max-age=60, s-maxage=60')
    headers.set('X-Masmo-Edge-Cache', 'MISS')

    const edgeResponse = new Response(response.body, {
      status: response.status,
      headers,
    })

    if (response.ok) {
      context.waitUntil(cache.put(cacheKey, edgeResponse.clone()))
    }

    return edgeResponse
  }

  const response = await proxyToBackend(
    request,
    backendBase,
    url.pathname,
    url.search,
  )

  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'no-store')
  headers.set('X-Masmo-Edge-Cache', 'BYPASS')

  return new Response(response.body, {
    status: response.status,
    headers,
  })
}
