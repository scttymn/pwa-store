import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { originDown: Boolean, slug: String }
  static targets = [ "icon", "originDown" ]

  connect() {
    if (this.originDownValue && this.hasOriginDownTarget) {
      this.originDownTarget.hidden = false
    }
    if (this.hasIconTarget) {
      this.iconTarget.addEventListener("error", () => {
        if (this.hasOriginDownTarget) this.originDownTarget.hidden = false
      })
    }
  }

  share() {
    const url = window.location.href
    if (navigator.share) {
      navigator.share({ title: document.title, url }).catch(() => {})
      return
    }
    if (navigator.clipboard) navigator.clipboard.writeText(url)
  }
}
