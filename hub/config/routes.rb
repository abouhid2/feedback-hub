Rails.application.routes.draw do
  # Webhook endpoints (receive external platform payloads)
  namespace :webhooks do
    post "slack", to: "slack#create"
    post "intercom", to: "intercom#create"
    post "whatsapp", to: "whatsapp#create"
  end

  # API endpoints (serve the frontend)
  namespace :api do
    resources :tickets, only: [:index, :show]
  end

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
end
