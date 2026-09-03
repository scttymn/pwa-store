import { Controller } from "@hotwired/stimulus"
import { readLibrary } from "library"

export default class extends Controller {
  static targets = [ "empty", "installed", "summary" ]

  connect() {
    this.refresh = this.refresh.bind(this)
    window.addEventListener("pwa-store:library", this.refresh)
    this.refresh()
  }

  disconnect() {
    window.removeEventListener("pwa-store:library", this.refresh)
  }

  refresh() {
    const slugs = readLibrary()
    const rows = this.element.querySelectorAll("[data-slug]")
    let visible = 0
    rows.forEach((row) => {
      const onDevice = slugs.includes(row.dataset.slug)
      row.hidden = !onDevice
      if (onDevice) visible += 1
    })

    if (this.hasEmptyTarget) this.emptyTarget.hidden = visible > 0
    if (this.hasInstalledTarget) this.installedTarget.hidden = visible === 0
    if (this.hasSummaryTarget) {
      this.summaryTarget.hidden = visible === 0
      const word = visible === 1 ? "app" : "apps"
      this.summaryTarget.textContent = `${visible === 0 ? "No" : numberWord(visible)} ${word} on this device. They open from your Home Screen.`
    }
  }
}

function numberWord(value) {
  return [ "No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight" ][value] || String(value)
}
