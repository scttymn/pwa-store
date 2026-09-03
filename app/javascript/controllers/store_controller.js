import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "offline" ]

  connect() {
    this.sync = this.sync.bind(this)
    window.addEventListener("online", this.sync)
    window.addEventListener("offline", this.sync)
    this.sync()
  }

  disconnect() {
    window.removeEventListener("online", this.sync)
    window.removeEventListener("offline", this.sync)
  }

  sync() {
    if (!this.hasOfflineTarget) return
    const offline = window.navigator.onLine === false
    this.offlineTarget.hidden = !offline
    document.querySelector(".store-frame")?.toggleAttribute("hidden", offline)
    document.querySelector(".bottom-nav")?.classList.toggle("is-offline", offline)
  }

  retry() {
    if (window.navigator.onLine === false) return
    window.location.reload()
  }

  clearSearch() {
    const input = this.element.querySelector("input[name=q]")
    if (input) input.value = ""
  }
}
