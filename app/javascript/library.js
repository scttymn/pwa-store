const KEY = "pwa-store.library"

export function readLibrary() {
  try {
    const raw = JSON.parse(window.localStorage.getItem(KEY) || "[]")
    return Array.isArray(raw) ? raw.filter((slug) => typeof slug === "string") : []
  } catch (_error) {
    return []
  }
}

export function writeLibrary(slugs) {
  const next = [ ...new Set(slugs) ]
  window.localStorage.setItem(KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent("pwa-store:library", { detail: { slugs: next } }))
  return next
}

export function markInstalled(slug) {
  if (!slug) return readLibrary()
  const next = readLibrary()
  if (!next.includes(slug)) next.push(slug)
  return writeLibrary(next)
}

export function isInLibrary(slug) {
  return readLibrary().includes(slug)
}
