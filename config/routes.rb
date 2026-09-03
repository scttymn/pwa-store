Rails.application.routes.draw do
  get "up" => "rails/health#show", as: :rails_health_check

  get "manifest" => "rails/pwa#manifest", as: :pwa_manifest
  get "service-worker" => "rails/pwa#service_worker", as: :pwa_service_worker
  get "service-worker.js" => "rails/pwa#service_worker"

  root "listings#index"
  get "apps/:slug", to: "listings#show", as: :app
  get "explore", to: "explores#show", as: :explore
  get "search", to: "searches#show", as: :search
  get "library", to: "libraries#show", as: :library
  get "install-demo", to: "install_demos#show", as: :install_demo
  get "spike", to: "install_demos#show"
end
