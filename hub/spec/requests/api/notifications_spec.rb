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

    it "includes nested ticket" do
      get "/api/notifications/#{notification.id}"

      body = JSON.parse(response.body)
      expect(body["ticket"]["id"]).to eq(ticket.id)
      expect(body["ticket"]["title"]).to eq(ticket.title)
      expect(body["ticket"]["status"]).to eq(ticket.status)
      expect(body["ticket"]["reporter"]["name"]).to eq(ticket.reporter.name)
    end

    it "includes nested changelog_entry" do
      get "/api/notifications/#{notification.id}"

      body = JSON.parse(response.body)
      expect(body["changelog_entry"]["id"]).to eq(entry.id)
      expect(body["changelog_entry"]["content"]).to eq(entry.content)
      expect(body["changelog_entry"]["status"]).to eq("approved")
      expect(body["changelog_entry"]["ai_model"]).to eq(entry.ai_model)
      expect(body["changelog_entry"]["approved_by"]).to eq(entry.approved_by)
    end

    it "returns empty related_tickets when ticket has no group" do
      get "/api/notifications/#{notification.id}"

      body = JSON.parse(response.body)
      expect(body["related_tickets"]).to eq([])
    end

    context "when ticket belongs to a group" do
      let(:sibling_ticket) { create(:ticket, :resolved) }
      let!(:group) do
        TicketGroupService.create_group(
          name: "Test Group",
          ticket_ids: [ticket.id, sibling_ticket.id],
          primary_ticket_id: ticket.id
        )
      end

      it "includes sibling tickets in related_tickets" do
        get "/api/notifications/#{notification.id}"

        body = JSON.parse(response.body)
        expect(body["related_tickets"].length).to eq(1)
        expect(body["related_tickets"].first["id"]).to eq(sibling_ticket.id)
        expect(body["related_tickets"].first["title"]).to eq(sibling_ticket.title)
        expect(body["related_tickets"].first["reporter"]["name"]).to eq(sibling_ticket.reporter.name)
      end

      it "does not include the notification's own ticket in related_tickets" do
        get "/api/notifications/#{notification.id}"

        body = JSON.parse(response.body)
        related_ids = body["related_tickets"].map { |t| t["id"] }
        expect(related_ids).not_to include(ticket.id)
      end
    end

    it "returns not found for invalid id" do
      get "/api/notifications/#{SecureRandom.uuid}"

      expect(response).to have_http_status(:not_found)
    end
  end
end
