/**
 * Host half of the opencode-session bundle.
 *
 * The OpenCode Go gateway routes and caches by conversation and answers
 * `400 MissingSessionID` when the `x-opencode-session` header is absent. pi-ai
 * adds that header itself for the two providers it ships (`opencode` and
 * `opencode-go`), but it cannot do so for a route a profile declares by hand —
 * and a second Go subscription is necessarily such a route, because one pi-ai
 * provider id carries one credential.
 *
 * This plugin supplies the missing half: it contributes the header through the
 * `llm-pi-ai/request-headers` waterfall, using the Session id pi-ai would have
 * received anyway, so a hand-declared route behaves exactly like a shipped one.
 * It is deliberately provider-agnostic: any route whose id marks it as OpenCode
 * gets the header, and adding it twice is impossible because pi-ai skips a
 * header it already finds.
 */

import { randomUUID } from 'node:crypto'

/** Header the OpenCode gateway requires on every inference request. */
const DEFAULT_HEADER = 'x-opencode-session'
/** Added to an id that cannot travel as an HTTP header value. */
const HEADER_UNSAFE = /[^\t\x20-\x7e\x80-\xff]/u

/**
 * Install the header contributor.
 *
 * `llm-pi-ai/request-headers` runs synchronously before each dispatch and hands
 * over a request-owned `Headers` copy; listeners edit that copy and return
 * `next()`. Nothing is retained after the call returns.
 * @param {object} ctx Host context.
 * @param {{headerName?: string, providers?: string[], fallbackSessionId?: string}} [config] bundle options.
 */
export function apply(ctx, config = {}) {
  const headerName = nonEmpty(config.headerName) ?? DEFAULT_HEADER
  const explicit = Array.isArray(config.providers)
    ? config.providers.filter((provider) => typeof provider === 'string' && provider.length > 0)
    : undefined
  // Auxiliary calls (title generation, compaction) may carry no Session id; a
  // stable process-wide value still satisfies the gateway, which only asks the
  // header to be stable for one conversation.
  const fallback = nonEmpty(config.fallbackSessionId) ?? `dsh-${randomUUID()}`

  const covers = (provider) => {
    if (typeof provider !== 'string' || provider.length === 0) return false
    if (explicit !== undefined) return explicit.includes(provider)
    return /opencode/iu.test(provider)
  }

  const listener = (request, headers, next) => {
    try {
      if (headers !== undefined && headers !== null && typeof headers.set === 'function' && covers(request?.provider)) {
        if (!headers.has(headerName)) {
          const candidate = sessionValue(request?.sessionId, fallback)
          if (candidate !== undefined) headers.set(headerName, candidate)
        }
      }
    } catch {
      // A header failure must not replace the provider's own diagnostic.
    }
    return next()
  }

  ctx.on('llm-pi-ai/request-headers', listener)
}

/** The value to send: the Session id when it is header-safe, otherwise the fallback. */
function sessionValue(sessionId, fallback) {
  if (typeof sessionId === 'string' && sessionId.length > 0 && !HEADER_UNSAFE.test(sessionId)) return sessionId
  if (typeof sessionId === 'number' && Number.isFinite(sessionId)) return String(sessionId)
  return HEADER_UNSAFE.test(fallback) ? undefined : fallback
}

function nonEmpty(value) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}
