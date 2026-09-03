// Vanilla JS install detection. No TypeScript.
// Pass an `env` object in tests; the browser uses navigator/window/document.

export const RECOMMENDED_PATHS = {
  ALREADY_INSTALLED: "already-installed",
  PROMPT: "prompt",
  IOS_A2HS: "ios-a2hs",
  BROWSER_MENU: "browser-menu",
  OPEN_IN_BROWSER: "open-in-browser",
  UNSUPPORTED: "unsupported"
}

const DEFERRED_KEY = "__pwaStoreDeferredPrompt"

function defaultEnv() {
  const nav = typeof navigator !== "undefined" ? navigator : {}
  const win = typeof window !== "undefined" ? window : {}
  const doc = typeof document !== "undefined" ? document : {}

  return {
    userAgent: nav.userAgent || "",
    vendor: nav.vendor || "",
    platform: nav.platform || "",
    maxTouchPoints: nav.maxTouchPoints || 0,
    standalone: nav.standalone === true,
    matchMedia: typeof win.matchMedia === "function" ? win.matchMedia.bind(win) : null,
    deferredPrompt: win[DEFERRED_KEY] || null,
    locationHref: win.location && win.location.href ? win.location.href : "",
    referrer: doc.referrer || ""
  }
}

export function isSameOrigin(urlA, urlB) {
  try {
    if (!urlA || !urlB) return false
    return new URL(urlA, urlB).origin === new URL(urlB).origin
  } catch (_error) {
    return false
  }
}

export function detectPlatform(env = defaultEnv()) {
  const ua = env.userAgent || ""
  const isIPadOS = env.platform === "MacIntel" && (env.maxTouchPoints || 0) > 1
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || isIPadOS
  const isAndroid = /Android/i.test(ua)
  const isMobile = isIOS || isAndroid || /Mobile|Tablet/i.test(ua)

  const isWebView = isInAppWebView(ua, isAndroid, isIOS)

  let browser = "unknown"
  if (/SamsungBrowser/i.test(ua)) {
    browser = "samsung"
  } else if (/EdgiOS/i.test(ua) || /EdgA\//i.test(ua) || /Edg\//i.test(ua)) {
    browser = "edge"
  } else if (/FxiOS/i.test(ua) || /Firefox\//i.test(ua)) {
    browser = "firefox"
  } else if (/CriOS/i.test(ua)) {
    browser = "chrome"
  } else if (isIOS && /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/i.test(ua)) {
    browser = "safari"
  } else if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua) && !/OPR\//i.test(ua)) {
    browser = "chrome"
  } else if (/Safari/i.test(ua) && !/Chrome\//i.test(ua) && !/Android/i.test(ua)) {
    browser = "safari"
  }

  const formFactor = isMobile ? "mobile" : "desktop"
  const os = isIOS ? "ios" : isAndroid ? "android" : "desktop"

  return {
    os,
    browser,
    formFactor,
    isIOS,
    isAndroid,
    isDesktop: !isMobile,
    isWebView,
    platform: describePlatform({ os, browser, isWebView })
  }
}

function isInAppWebView(ua, isAndroid, isIOS) {
  if (/(Instagram|FBAN|FBAV|FB_IAB|FB4A|FBIOS|Line\/|LinkedInApp|Twitter|TikTok|BytedanceWebview|Snapchat|GSA\/)/i.test(ua)) {
    return true
  }
  if (isAndroid && /;\s*wv\b/i.test(ua)) return true
  if (isIOS && /AppleWebKit/i.test(ua) && !/Safari\//i.test(ua) && !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua)) {
    return true
  }
  return false
}

function describePlatform({ os, browser, isWebView }) {
  if (isWebView) return `${os}-webview`
  if (os === "ios") return `ios-${browser}`
  if (os === "android") return `android-${browser}`
  return `desktop-${browser}`
}

export function isAlreadyInstalled(env = defaultEnv()) {
  if (env.standalone === true) return true
  if (!env.matchMedia) return false

  const modes = [
    "(display-mode: standalone)",
    "(display-mode: fullscreen)",
    "(display-mode: minimal-ui)",
    "(display-mode: window-controls-overlay)"
  ]

  return modes.some((query) => {
    try {
      const media = env.matchMedia(query)
      return !!(media && media.matches)
    } catch (_error) {
      return false
    }
  })
}

export function detectInstallContext(env = defaultEnv()) {
  const detected = detectPlatform(env)
  const alreadyInstalled = isAlreadyInstalled(env)
  const canPrompt = !!(env.deferredPrompt && typeof env.deferredPrompt.prompt === "function")
  const recommendedPath = pickRecommendedPath({ detected, alreadyInstalled, canPrompt })

  return {
    platform: detected.platform,
    canPrompt,
    alreadyInstalled,
    recommendedPath,
    os: detected.os,
    browser: detected.browser,
    formFactor: detected.formFactor,
    isWebView: detected.isWebView
  }
}

function pickRecommendedPath({ detected, alreadyInstalled, canPrompt }) {
  if (alreadyInstalled) return RECOMMENDED_PATHS.ALREADY_INSTALLED
  if (detected.isWebView) return RECOMMENDED_PATHS.OPEN_IN_BROWSER

  if (detected.isIOS) {
    if (detected.browser === "safari") return RECOMMENDED_PATHS.IOS_A2HS
    return RECOMMENDED_PATHS.OPEN_IN_BROWSER
  }

  if (canPrompt) return RECOMMENDED_PATHS.PROMPT

  if (detected.browser === "chrome" || detected.browser === "edge" || detected.browser === "samsung") {
    return RECOMMENDED_PATHS.BROWSER_MENU
  }

  if (detected.browser === "firefox" && detected.isAndroid) {
    return RECOMMENDED_PATHS.BROWSER_MENU
  }

  return RECOMMENDED_PATHS.UNSUPPORTED
}

let deferredPrompt = null

export function captureBeforeInstallPrompt(event) {
  if (event && typeof event.preventDefault === "function") {
    event.preventDefault()
  }
  deferredPrompt = event
  if (typeof window !== "undefined") {
    window[DEFERRED_KEY] = event
  }
  return event
}

export function getDeferredPrompt() {
  if (typeof window !== "undefined" && window[DEFERRED_KEY]) {
    return window[DEFERRED_KEY]
  }
  return deferredPrompt
}

export async function promptInstall() {
  const promptEvent = getDeferredPrompt()
  if (!promptEvent || typeof promptEvent.prompt !== "function") {
    return { ok: false, reason: "no-prompt" }
  }

  promptEvent.prompt()
  const choice = promptEvent.userChoice ? await promptEvent.userChoice : null
  deferredPrompt = null
  if (typeof window !== "undefined") {
    window[DEFERRED_KEY] = null
  }
  return { ok: true, outcome: choice && choice.outcome }
}

export function listenForBeforeInstallPrompt(target) {
  const host = target || (typeof window !== "undefined" ? window : null)
  if (!host || typeof host.addEventListener !== "function") return function noop() {}

  const handler = (event) => captureBeforeInstallPrompt(event)
  host.addEventListener("beforeinstallprompt", handler)
  return function unlisten() {
    host.removeEventListener("beforeinstallprompt", handler)
  }
}

export function iosA2HSSteps() {
  return [
    "Open this page in Safari — not Chrome, Firefox, Edge, or an in-app browser.",
    "Tap the Share button (square with an up arrow).",
    "Scroll the share sheet and tap Add to Home Screen.",
    "Confirm the name, then tap Add."
  ]
}

function browserMenuSteps(context) {
  if (context.browser === "samsung") {
    return [
      "Open the app's own site in Samsung Internet.",
      "Tap the menu, then Add page to / Install."
    ]
  }
  if (context.browser === "firefox") {
    return [
      "Open the app's own site in Firefox.",
      "Open the page menu and choose Install if it is offered."
    ]
  }
  return [
    "Open the app's own site in this browser.",
    "Open the browser menu (⋮).",
    "Choose Install app / Cast, save, and share → Install page as app."
  ]
}

function openInBrowserSteps(context) {
  if (context.isWebView) {
    return [
      "This is an in-app browser (for example Instagram or Facebook).",
      "It cannot install PWAs.",
      "Open the URL in Chrome, Edge, Samsung Internet, or Safari instead."
    ]
  }
  if (context.isIOS) {
    return [
      `${labelBrowser(context.browser)} on iOS cannot install PWAs.`,
      "Copy the URL and open it in Safari, then use Share → Add to Home Screen."
    ]
  }
  return [
    "This browser cannot install the app.",
    "Copy the URL and open it in a Chromium browser or (on iPhone) Safari."
  ]
}

function unsupportedSteps(context) {
  if (context.browser === "safari" && context.isDesktop) {
    return [
      "Desktop Safari has no beforeinstallprompt API.",
      "Recent Safari versions can Add to Dock from the File / Share menu; this spike does not fake an install API.",
      "For a Chromium-style install, open the app in Chrome or Edge."
    ]
  }
  if (context.browser === "firefox") {
    return [
      "Desktop Firefox cannot install PWAs.",
      "Open the app in Chrome, Edge, or (on Android) Firefox's page menu if Install appears."
    ]
  }
  return [
    "This browser cannot install the app as a standalone PWA.",
    "Open the URL in Chrome, Edge, Samsung Internet, or iOS Safari."
  ]
}

function labelBrowser(browser) {
  const names = {
    chrome: "Chrome",
    firefox: "Firefox",
    edge: "Edge",
    safari: "Safari",
    samsung: "Samsung Internet",
    unknown: "This browser"
  }
  return names[browser] || browser
}

function defaultRender() {}

export function startInstallGuide(options = {}) {
  const env = options.env || defaultEnv()
  const mergedEnv = {
    ...env,
    deferredPrompt: env.deferredPrompt || getDeferredPrompt()
  }
  const context = detectInstallContext(mergedEnv)
  const originUrl = options.originUrl || mergedEnv.locationHref || ""
  const name = options.name || "this app"
  const sameOrigin = isSameOrigin(originUrl, mergedEnv.locationHref)
  const render = options.render || defaultRender

  const guide = buildGuide({ context, originUrl, name, sameOrigin })
  if (typeof render === "function") render(guide)
  return guide
}

function buildGuide({ context, originUrl, name, sameOrigin }) {
  const guide = {
    context,
    name,
    originUrl,
    sameOrigin,
    title: "",
    steps: [],
    actions: [],
    effectivePath: context.recommendedPath
  }

  switch (context.recommendedPath) {
    case RECOMMENDED_PATHS.ALREADY_INSTALLED:
      guide.title = "Already installed (standalone display mode)."
      guide.actions.push({ id: "open", label: `Open ${name}`, href: originUrl })
      break
    case RECOMMENDED_PATHS.PROMPT:
      if (sameOrigin) {
        guide.title = "This browser can show a native install prompt."
        guide.actions.push({ id: "prompt", label: `Install ${name}` })
      } else {
        guide.effectivePath = "open-then-prompt"
        guide.title = `Open ${name} to install. The install prompt belongs to that site, not this catalog.`
        guide.steps = [
          `Open ${name} on its own origin.`,
          "Accept the browser install prompt if it appears.",
          "Otherwise use the browser menu: Install app."
        ]
        guide.actions.push({ id: "open", label: `Open ${name}`, href: originUrl })
        guide.actions.push({ id: "copy", label: "Copy URL", url: originUrl })
      }
      break
    case RECOMMENDED_PATHS.IOS_A2HS:
      guide.title = "iOS Safari: Add to Home Screen. There is no install API to call."
      guide.steps = iosA2HSSteps()
      guide.actions.push({ id: "open", label: `Open ${name}`, href: originUrl })
      guide.actions.push({ id: "copy", label: "Copy URL", url: originUrl })
      break
    case RECOMMENDED_PATHS.BROWSER_MENU:
      guide.title = "No captured beforeinstallprompt. Use the browser install menu."
      guide.steps = browserMenuSteps(context)
      guide.actions.push({ id: "open", label: `Open ${name}`, href: originUrl })
      guide.actions.push({ id: "copy", label: "Copy URL", url: originUrl })
      break
    case RECOMMENDED_PATHS.OPEN_IN_BROWSER:
      guide.title = "This surface cannot install PWAs. Open a full browser."
      guide.steps = openInBrowserSteps(context)
      guide.actions.push({ id: "open", label: "Open in browser", href: originUrl })
      guide.actions.push({ id: "copy", label: "Copy URL", url: originUrl })
      break
    default:
      guide.title = "This browser cannot install the app as a PWA."
      guide.steps = unsupportedSteps(context)
      guide.actions.push({ id: "open", label: `Open ${name}`, href: originUrl })
      guide.actions.push({ id: "copy", label: "Copy URL", url: originUrl })
  }

  return guide
}
