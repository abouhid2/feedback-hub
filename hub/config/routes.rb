Rails.application.routes.draw do
  # Webhook endpoints (receive external platform payloads)
  namespace :webhooks do
    post "slack", to: "slack#create"
    post "intercom", to: "intercom#create"
    post "whatsapp", to: "whatsapp#create"
  end

  # API endpoints (serve the frontend)
  namespace :api do
    resources :tickets, only: [:index, :show, :create, :update] do
      member do
        get :changelog, to: "changelogs#show"
        post :generate_changelog, to: "changelogs#create"
        patch :approve_changelog, to: "changelogs#approve"
      end
    end

    resources :notifications, only: [:index, :show]

    resource :batch_reviews, only: [] do
      get :pending
      post :approve_all
      post :approve_selected
      post :reject_all
    end

    resource :metrics, only: [] do
      get :summary
    end
  end

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
end
