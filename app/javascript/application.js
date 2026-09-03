import { listenForBeforeInstallPrompt } from "install_guide"
import "@hotwired/turbo-rails"
import "controllers"
import "library"

// Capture beforeinstallprompt as early as the module graph allows.
listenForBeforeInstallPrompt()

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/service-worker.js")
  })
}
