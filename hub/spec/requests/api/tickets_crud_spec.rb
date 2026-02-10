require "rails_helper"

RSpec.describe "Api::Tickets CRUD", type: :request do
  describe "POST /api/tickets" do
    let(:valid_params) do
      {
        title: "Login button broken on mobile",
        description: "Users on iOS cannot tap the login button",
        ticket_type: "bug",
        priority: 2,
        original_channel: "slack"
      }
    end

    it "creates a ticket and returns it" do
      post "/api/tickets", params: valid_params

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["title"]).to eq("Login button broken on mobile")
      expect(body["status"]).to eq("open")
      expect(body["priority"]).to eq(2)
    end

    it "creates a 'created' ticket event" do
      expect {
        post "/api/tickets", params: valid_params
      }.to change(TicketEvent, :count).by(1)

      event = TicketEvent.last
      expect(event.event_type).to eq("created")
      expect(event.actor_type).to eq("user")
    end

    it "returns validation errors for missing title" do
      post "/api/tickets", params: valid_params.except(:title)

      expect(response).to have_http_status(:unprocessable_entity)
      body = JSON.parse(response.body)
      expect(body["errors"]).to be_present
    end

    it "returns validation errors for invalid channel" do
      post "/api/tickets", params: valid_params.merge(original_channel: "telegram")

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/tickets/:id" do
    let!(:ticket) { create(:ticket, status: "open", priority: 3) }

    it "updates ticket fields" do
      patch "/api/tickets/#{ticket.id}", params: { status: "in_progress", priority: 1 }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["status"]).to eq("in_progress")
      expect(body["priority"]).to eq(1)
    end

    it "creates a status_changed event when status changes" do
      expect {
        patch "/api/tickets/#{ticket.id}", params: { status: "resolved" }
      }.to change { ticket.ticket_events.where(event_type: "status_changed").count }.by(1)
    end

    it "returns not found for invalid id" do
      patch "/api/tickets/#{SecureRandom.uuid}", params: { status: "resolved" }

      expect(response).to have_http_status(:not_found)
    end

    it "returns validation errors for invalid status" do
      patch "/api/tickets/#{ticket.id}", params: { status: "invalid" }

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
