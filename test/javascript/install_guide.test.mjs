import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  detectInstallContext,
  detectPlatform,
  isAlreadyInstalled,
  isSameOrigin,
  startInstallGuide,
  promptInstall,
  captureBeforeInstallPrompt,
  RECOMMENDED_PATHS
} from "../../app/javascript/install_guide.js"

const UA = {
  chromeAndroid:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36",
  chromeDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Safari/537.36",
  edgeDesktop:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0",
  safariIOS:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  safariMac:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
  firefoxDesktop:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:123.0) Gecko/20100101 Firefox/123.0",
  firefoxIOS:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/123.0 Mobile/15E148 Safari/605.1.15",
  firefoxAndroid:
    "Mozilla/5.0 (Android 14; Mobile; rv:123.0) Gecko/123.0 Firefox/123.0",
  samsung:
    "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/24.0 Chrome/117.0.0.0 Mobile Safari/537.36",
  chromeIOS:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.6261.64 Mobile/15E148 Safari/604.1",
  instagramIOS:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 300.0.0.0.0",
  androidWebView:
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/122.0.6261.64 Mobile Safari/537.36; wv"
}

function env(userAgent, extras = {}) {
  return {
    userAgent,
    platform: extras.platform || "",
    maxTouchPoints: extras.maxTouchPoints || 0,
    standalone: extras.standalone || false,
    matchMedia: extras.matchMedia || null,
    deferredPrompt: extras.deferredPrompt || null,
    locationHref: extras.locationHref || "https://store.example/"
  }
}

function fakePrompt() {
  return { prompt() {} }
}

describe("detectPlatform", () => {
  it("labels Chrome Android, desktop Chrome, and Edge", () => {
    assert.equal(detectPlatform(env(UA.chromeAndroid)).platform, "android-chrome")
    assert.equal(detectPlatform(env(UA.chromeDesktop)).platform, "desktop-chrome")
    assert.equal(detectPlatform(env(UA.edgeDesktop)).platform, "desktop-edge")
  })

  it("labels Safari iOS vs Safari macOS vs Firefox iOS", () => {
    assert.equal(detectPlatform(env(UA.safariIOS)).platform, "ios-safari")
    assert.equal(detectPlatform(env(UA.safariMac)).platform, "desktop-safari")
    assert.equal(detectPlatform(env(UA.firefoxIOS)).platform, "ios-firefox")
  })

  it("labels Samsung Internet and iPadOS desktop-UA", () => {
    assert.equal(detectPlatform(env(UA.samsung)).platform, "android-samsung")
    const ipad = detectPlatform(env(UA.safariMac, { platform: "MacIntel", maxTouchPoints: 5 }))
    assert.equal(ipad.platform, "ios-safari")
    assert.equal(ipad.isIOS, true)
  })

  it("detects in-app webviews", () => {
    assert.equal(detectPlatform(env(UA.instagramIOS)).isWebView, true)
    assert.equal(detectPlatform(env(UA.androidWebView)).isWebView, true)
    assert.equal(detectPlatform(env(UA.chromeAndroid)).isWebView, false)
  })
})

describe("detectInstallContext", () => {
  it("uses a captured beforeinstallprompt on desktop Chromium", () => {
    const context = detectInstallContext(env(UA.chromeDesktop, { deferredPrompt: fakePrompt() }))
    assert.equal(context.canPrompt, true)
    assert.equal(context.alreadyInstalled, false)
    assert.equal(context.recommendedPath, RECOMMENDED_PATHS.PROMPT)
  })

  it("falls back to the browser menu when BIP is missing", () => {
    assert.equal(detectInstallContext(env(UA.chromeDesktop)).recommendedPath, RECOMMENDED_PATHS.BROWSER_MENU)
    assert.equal(detectInstallContext(env(UA.edgeDesktop)).recommendedPath, RECOMMENDED_PATHS.BROWSER_MENU)
    assert.equal(detectInstallContext(env(UA.samsung)).recommendedPath, RECOMMENDED_PATHS.BROWSER_MENU)
    assert.equal(detectInstallContext(env(UA.firefoxAndroid)).recommendedPath, RECOMMENDED_PATHS.BROWSER_MENU)
  })

  it("uses iOS A2HS only in Safari", () => {
    assert.equal(detectInstallContext(env(UA.safariIOS)).recommendedPath, RECOMMENDED_PATHS.IOS_A2HS)
    assert.equal(detectInstallContext(env(UA.chromeIOS)).recommendedPath, RECOMMENDED_PATHS.OPEN_IN_BROWSER)
    assert.equal(detectInstallContext(env(UA.firefoxIOS)).recommendedPath, RECOMMENDED_PATHS.OPEN_IN_BROWSER)
  })

  it("marks desktop Safari and desktop Firefox as unsupported", () => {
    assert.equal(detectInstallContext(env(UA.safariMac)).recommendedPath, RECOMMENDED_PATHS.UNSUPPORTED)
    assert.equal(detectInstallContext(env(UA.firefoxDesktop)).recommendedPath, RECOMMENDED_PATHS.UNSUPPORTED)
  })

  it("sends webviews to open-in-browser", () => {
    assert.equal(detectInstallContext(env(UA.instagramIOS)).recommendedPath, RECOMMENDED_PATHS.OPEN_IN_BROWSER)
    assert.equal(detectInstallContext(env(UA.androidWebView)).recommendedPath, RECOMMENDED_PATHS.OPEN_IN_BROWSER)
  })

  it("detects already-installed via standalone and display-mode", () => {
    assert.equal(detectInstallContext(env(UA.safariIOS, { standalone: true })).alreadyInstalled, true)
    assert.equal(detectInstallContext(env(UA.safariIOS, { standalone: true })).recommendedPath, RECOMMENDED_PATHS.ALREADY_INSTALLED)

    const matchMedia = (query) => ({ matches: query === "(display-mode: standalone)" })
    assert.equal(isAlreadyInstalled(env(UA.chromeDesktop, { matchMedia })), true)
    assert.equal(
      detectInstallContext(env(UA.chromeDesktop, { matchMedia, deferredPrompt: fakePrompt() })).recommendedPath,
      RECOMMENDED_PATHS.ALREADY_INSTALLED
    )
  })
})

describe("startInstallGuide + promptInstall", () => {
  it("does not fake an install API on iOS Safari", () => {
    const guide = startInstallGuide({
      env: env(UA.safariIOS),
      originUrl: "https://squoosh.app/",
      name: "Squoosh"
    })
    assert.equal(guide.effectivePath, RECOMMENDED_PATHS.IOS_A2HS)
    assert.ok(guide.steps.some((step) => /Add to Home Screen/.test(step)))
    assert.ok(!guide.actions.some((action) => action.id === "prompt"))
  })

  it("does not call the store prompt for a cross-origin listing", () => {
    const guide = startInstallGuide({
      env: env(UA.chromeDesktop, {
        deferredPrompt: fakePrompt(),
        locationHref: "https://store.example/"
      }),
      originUrl: "https://squoosh.app/",
      name: "Squoosh"
    })
    assert.equal(guide.sameOrigin, false)
    assert.equal(guide.effectivePath, "open-then-prompt")
    assert.ok(guide.actions.some((action) => action.id === "open"))
    assert.ok(!guide.actions.some((action) => action.id === "prompt"))
  })

  it("exposes promptInstall when the current origin captured BIP", () => {
    const guide = startInstallGuide({
      env: env(UA.chromeDesktop, {
        deferredPrompt: fakePrompt(),
        locationHref: "https://store.example/install-demo"
      }),
      originUrl: "https://store.example/",
      name: "PWA Store"
    })
    assert.equal(guide.sameOrigin, true)
    assert.equal(guide.effectivePath, RECOMMENDED_PATHS.PROMPT)
    assert.ok(guide.actions.some((action) => action.id === "prompt"))
  })

  it("offers copy URL when the browser cannot install", () => {
    const guide = startInstallGuide({
      env: env(UA.firefoxDesktop),
      originUrl: "https://excalidraw.com/",
      name: "Excalidraw"
    })
    assert.equal(guide.effectivePath, RECOMMENDED_PATHS.UNSUPPORTED)
    assert.ok(guide.actions.some((action) => action.id === "copy"))
  })

  it("promptInstall returns no-prompt without a captured event", async () => {
    const result = await promptInstall()
    assert.deepEqual(result, { ok: false, reason: "no-prompt" })
  })

  it("captureBeforeInstallPrompt preventDefaults and promptInstall consumes it", async () => {
    let prevented = false
    const event = {
      preventDefault() { prevented = true },
      async prompt() {},
      userChoice: Promise.resolve({ outcome: "accepted" })
    }
    captureBeforeInstallPrompt(event)
    assert.equal(prevented, true)
    const result = await promptInstall()
    assert.deepEqual(result, { ok: true, outcome: "accepted" })
  })
})

describe("isSameOrigin", () => {
  it("compares origins only", () => {
    assert.equal(isSameOrigin("https://store.example/apps/x", "https://store.example/"), true)
    assert.equal(isSameOrigin("https://squoosh.app/", "https://store.example/"), false)
    assert.equal(isSameOrigin("", "https://store.example/"), false)
  })
})
