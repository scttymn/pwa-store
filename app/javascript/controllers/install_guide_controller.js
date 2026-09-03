import { Controller } from "@hotwired/stimulus"
import {
  detectInstallContext,
  startInstallGuide,
  promptInstall,
  listenForBeforeInstallPrompt,
  iosInstallScreens,
  preferredBrowserLabel
} from "install_guide"
import { isInLibrary, markInstalled } from "library"

export default class extends Controller {
  static values = {
    originUrl: String,
    name: String,
    slug: String,
    icon: String,
    host: String
  }
  static targets = [
    "output", "panel", "sheet", "stepLabel", "ios", "iosHeading", "iosBody", "iosArt", "iosNext",
    "android", "desktop", "fallback", "fallbackBody", "fallbackOpen",
    "installButton", "caption", "installed", "help"
  ]

  connect() {
    this.unlisten = listenForBeforeInstallPrompt()
    this.refresh = () => { if (this.hasOutputTarget) this.dump() }
    window.addEventListener("beforeinstallprompt", this.refresh)
    this.refresh()
    this.timer = window.setTimeout(this.refresh, 1500)
    this.iosIndex = 0
    this.syncInstalled()
  }

  disconnect() {
    if (this.unlisten) this.unlisten()
    window.removeEventListener("beforeinstallprompt", this.refresh)
    if (this.timer) window.clearTimeout(this.timer)
  }

  dump() {
    const context = detectInstallContext()
    this.outputTarget.textContent = JSON.stringify(context, null, 2)
  }

  async install(event) {
    event.preventDefault()
    const originUrl = this.originUrlValue || window.location.href
    const name = this.nameValue || document.title || "this app"

    const guide = startInstallGuide({
      originUrl,
      name,
      render: (result) => this.renderGuide(result)
    })

    this.guide = guide
    this.showSheetFor(guide)

    if (guide.effectivePath === "prompt" && guide.sameOrigin && this.hasOutputTarget) {
      const result = await promptInstall()
      this.appendNote(result.ok ? `prompt outcome: ${result.outcome || "unknown"}` : "no captured beforeinstallprompt")
    }
  }

  async copy(event) {
    event.preventDefault()
    const url = (event.params && event.params.url) || this.originUrlValue || window.location.href
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url)
      this.appendNote("Copied URL")
      return
    }
    window.prompt("Copy URL", url)
  }

  close() {
    if (this.hasSheetTarget) this.sheetTarget.hidden = true
    this.hideModes()
  }

  nextIos() {
    const screens = iosInstallScreens(this.nameValue)
    this.iosIndex += 1
    if (this.iosIndex >= screens.length) {
      markInstalled(this.slugValue)
      this.syncInstalled()
      this.close()
      return
    }
    this.renderIosStep(screens[this.iosIndex])
  }

  async confirmAndroid() {
    if (this.guide && this.guide.sameOrigin) {
      await promptInstall()
    } else if (this.originUrlValue) {
      window.open(this.originUrlValue, "_blank", "noopener,noreferrer")
    }
    markInstalled(this.slugValue)
    this.syncInstalled()
    this.close()
  }

  async confirmDesktop() {
    if (this.guide && this.guide.sameOrigin) {
      await promptInstall()
    } else if (this.originUrlValue) {
      window.open(this.originUrlValue, "_blank", "noopener,noreferrer")
    }
    markInstalled(this.slugValue)
    this.syncInstalled()
    this.close()
  }

  openPreferred() {
    if (this.originUrlValue) {
      window.open(this.originUrlValue, "_blank", "noopener,noreferrer")
    }
  }

  renderGuide(guide) {
    if (!this.hasPanelTarget) return

    const lines = []
    lines.push(guide.title)
    if (guide.steps.length) {
      lines.push("")
      guide.steps.forEach((step, index) => lines.push(`${index + 1}. ${step}`))
    }
    this.panelTarget.replaceChildren()

    const pre = document.createElement("pre")
    pre.textContent = lines.join("\n")
    this.panelTarget.appendChild(pre)

    const actions = document.createElement("p")
    guide.actions.forEach((action) => {
      if (action.id === "copy") {
        const button = document.createElement("button")
        button.type = "button"
        button.textContent = action.label
        button.dataset.action = "install-guide#copy"
        button.dataset.installGuideUrlParam = action.url
        actions.appendChild(button)
        actions.appendChild(document.createTextNode(" "))
      } else if (action.href) {
        const link = document.createElement("a")
        link.href = action.href
        link.textContent = action.label
        link.target = "_blank"
        link.rel = "noopener noreferrer"
        actions.appendChild(link)
        actions.appendChild(document.createTextNode(" "))
      }
    })
    this.panelTarget.appendChild(actions)
  }

  appendNote(text) {
    if (!this.hasPanelTarget) return
    const note = document.createElement("p")
    note.textContent = text
    this.panelTarget.appendChild(note)
  }

  showSheetFor(guide) {
    if (!this.hasSheetTarget) return
    this.hideModes()
    this.sheetTarget.hidden = false
    const path = guide.effectivePath

    if (path === "ios-a2hs") {
      this.iosIndex = 0
      this.iosTarget.hidden = false
      this.renderIosStep(iosInstallScreens(this.nameValue)[0])
      return
    }

    if (path === "prompt" || path === "open-then-prompt" || path === "browser-menu") {
      if (guide.context.formFactor === "desktop") {
        this.desktopTarget.hidden = false
      } else {
        this.androidTarget.hidden = false
      }
      return
    }

    if (path === "already-installed") {
      this.close()
      this.syncInstalled(true)
      return
    }

    this.fallbackTarget.hidden = false
    const browser = preferredBrowserLabel(guide.context)
    if (this.hasFallbackOpenTarget) this.fallbackOpenTarget.textContent = `Open in ${browser}`
    if (this.hasFallbackBodyTarget) {
      this.fallbackBodyTarget.textContent =
        `Firefox and in-app browsers block Add to Home Screen. Open this listing in Safari (iPhone) or Chrome (Android) to install ${this.nameValue}.`
    }
  }

  renderIosStep(screen) {
    if (this.hasStepLabelTarget) this.stepLabelTarget.textContent = `${screen.step} of 3`
    if (this.hasIosHeadingTarget) this.iosHeadingTarget.textContent = screen.heading
    if (this.hasIosBodyTarget) this.iosBodyTarget.textContent = screen.body
    if (this.hasIosNextTarget) this.iosNextTarget.textContent = screen.step === 3 ? "Done" : "Next"
    if (this.hasIosArtTarget) this.iosArtTarget.innerHTML = iosArt(screen.step, this.nameValue, this.hostValue)
  }

  hideModes() {
    ;[ "ios", "android", "desktop", "fallback" ].forEach((name) => {
      const key = `${name}Target`
      if (this[`has${name.charAt(0).toUpperCase()}${name.slice(1)}Target`]) this[key].hidden = true
    })
    if (this.hasStepLabelTarget) this.stepLabelTarget.textContent = ""
  }

  syncInstalled(force) {
    const installed = force || isInLibrary(this.slugValue)
    if (!this.hasInstallButtonTarget) return
    if (installed) {
      this.installButtonTarget.textContent = "Open"
      this.installButtonTarget.classList.remove("btn-fill")
      this.installButtonTarget.classList.add("btn-outline")
      this.installButtonTarget.dataset.action = ""
      this.installButtonTarget.addEventListener("click", (event) => {
        event.preventDefault()
        if (this.originUrlValue) window.open(this.originUrlValue, "_blank", "noopener,noreferrer")
      }, { once: false })
      if (this.hasCaptionTarget) this.captionTarget.hidden = true
      if (this.hasInstalledTarget) this.installedTarget.hidden = false
      if (this.hasHelpTarget) this.helpTarget.hidden = false
    }
  }
}

function iosArt(step, name, host) {
  if (step === 1) {
    return `<div class="ios-share-bar">Safari · <span class="share-hit">Share ↑</span></div>`
  }
  if (step === 2) {
    return `<div class="ios-add-row a2hs-hit">＋ Add to Home Screen</div>`
  }
  return `<div class="ios-add-dialog"><strong>Add ${name}</strong><div class="muted">${host || ""}</div></div>
    <div class="home-grid"><span></span><span></span><span class="dock-hit"></span><span></span></div>`
}
