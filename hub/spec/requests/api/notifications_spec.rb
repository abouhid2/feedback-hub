require "rails_helper"

RSpec.describe "Api::Notifications", type: :request do
  let(:ticket) { create(:ticket, :resolved) }
  let(:entry) { create(:changelog_entry, :approved, ticket: ticket) }

  describe "GET /api/notifications" do
    let!(:pending) { create(:notification, ticket: ticket, changelog_entry: entry, status: "pending") }
    let!(:sent) { create(:notification, :sent, ticket: ticket, changelog_entry: entry) }
    let!(:failed) { create(:notification, :failed, ticket: ticket, changelog_entry: entry) }

    it "returns all notifications" do
      get "/api/notifications"

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.length).to eq(3)
    end

    it "filters by status" do
      get "/api/notifications", params: { status: "sent" }

      body = JSON.parse(response.body)
      expect(body.length).to eq(1)
      expect(body.first["status"]).to eq("sent")
    end

    it "filters by channel" do
      get "/api/notifications", params: { channel: "slack" }

      body = JSON.parse(response.body)
      body.each { |n| expect(n["channel"]).to eq("slack") }
    end
  end

  describe "GET /api/notifications/:id" do
    let!(:notification) { create(:notification, :failed, ticket: ticket, changelog_entry: entry) }

    it "returns notification detail with retry info" do
      get "/api/notifications/#{notification.id}"

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["id"]).to eq(notification.id)
      expect(body["retry_count"]).to eq(1)
      expect(body["last_error"]).to eq("Connection timeout")
    end

    it "returns not found for invalid id" do
      get "/api/notifications/#{SecureRandom.uuid}"

      expect(response).to have_http_status(:not_found)
    end
  end
end
