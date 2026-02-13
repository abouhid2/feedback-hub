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
        get :preview_changelog, to: "changelogs#preview"
        post :manual_changelog, to: "changelogs#manual_create"
        patch :approve_changelog, to: "changelogs#approve"
        patch :update_changelog_draft, to: "changelogs#update_draft"
        post :simulate_status
      end
    end

    resources :notifications, only: [:index, :show]
    resources :changelog_entries, only: [:index]

    resources :ticket_groups, only: [:index, :show, :create] do
      collection do
        post :suggest
        post :simulate_incident
        post :simulate_ticket
      end
      member do
        post :add_tickets
        delete :remove_ticket
        post :resolve
        post :generate_content
        get :preview_content
      end
    end

    resource :metrics, only: [] do
      get :summary
    end

    resources :dead_letter_jobs, only: [:index] do
      collection do
        post :force_fail
        get :force_fail_status
      end
      member do
        patch :resolve
        post :retry, to: "dead_letter_jobs#retry_job"
      end
    end
  end

  # Health check
  get "up" => "rails/health#show", as: :rails_health_check
end
