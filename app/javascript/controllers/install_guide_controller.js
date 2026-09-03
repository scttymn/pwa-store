import { Controller } from "@hotwired/stimulus"
import {
  detectInstallContext,
  startInstallGuide,
  promptInstall,
  listenForBeforeInstallPrompt
} from "install_guide"

// Thin Hotwire wrapper. Detection stays in vanilla install_guide.js.
export default class extends Controller {
  static values = {
    originUrl: String,
    name: String
  }
  static targets = ["output", "panel"]

  connect() {
    this.unlisten = listenForBeforeInstallPrompt()
    if (this.hasOutputTarget) this.dump()
  }

  disconnect() {
    if (this.unlisten) this.unlisten()
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

    if (guide.effectivePath === "prompt" && guide.sameOrigin) {
      const result = await promptInstall()
      this.appendNote(result.ok ? `prompt outcome: ${result.outcome || "unknown"}` : "no captured beforeinstallprompt")
    }
  }

  async copy(event) {
    event.preventDefault()
    const url = event.params.url || this.originUrlValue || window.location.href
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url)
      this.appendNote("Copied URL")
      return
    }
    window.prompt("Copy URL", url)
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
}
