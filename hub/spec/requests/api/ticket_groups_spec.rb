require "rails_helper"

RSpec.describe "Api::TicketGroups", type: :request do
  let(:reporter) { create(:reporter) }
  let!(:identity) { create(:reporter_identity, reporter: reporter, platform: "slack", platform_user_id: "U123ABC") }
  let!(:ticket1) { create(:ticket, reporter: reporter, original_channel: "slack") }
  let!(:ticket2) { create(:ticket, reporter: reporter, original_channel: "whatsapp") }

  before do
    stub_request(:post, "https://slack.com/api/chat.postMessage")
      .to_return(status: 200, body: '{"ok":true}', headers: { "Content-Type" => "application/json" })
  end

  describe "POST /api/ticket_groups" do
    it "creates a group with the given tickets" do
      post "/api/ticket_groups", params: {
        name: "Login bug duplicates",
        ticket_ids: [ticket1.id, ticket2.id],
        primary_ticket_id: ticket1.id
      }

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["name"]).to eq("Login bug duplicates")
      expect(body["tickets"].length).to eq(2)
    end

    it "returns 422 when fewer than 2 tickets" do
      post "/api/ticket_groups", params: {
        name: "Solo",
        ticket_ids: [ticket1.id],
        primary_ticket_id: ticket1.id
      }

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "GET /api/ticket_groups" do
    let!(:group) do
      TicketGroupService.create_group(
        name: "Test group",
        ticket_ids: [ticket1.id, ticket2.id],
        primary_ticket_id: ticket1.id
      )
    end

    it "returns all groups" do
      get "/api/ticket_groups"
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.length).to eq(1)
      expect(body.first["name"]).to eq("Test group")
    end

    it "filters by status" do
      get "/api/ticket_groups", params: { status: "resolved" }
      body = JSON.parse(response.body)
      expect(body).to be_empty
    end
  end

  describe "GET /api/ticket_groups/:id" do
    let!(:group) do
      TicketGroupService.create_group(
        name: "Test group",
        ticket_ids: [ticket1.id, ticket2.id],
        primary_ticket_id: ticket1.id
      )
    end

    it "returns group details with tickets" do
      get "/api/ticket_groups/#{group.id}"
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["name"]).to eq("Test group")
      expect(body["tickets"].length).to eq(2)
    end

    it "returns 404 for non-existent group" do
      get "/api/ticket_groups/non-existent-id"
      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/ticket_groups/:id/add_tickets" do
    let!(:ticket3) { create(:ticket, reporter: reporter) }
    let!(:group) do
      TicketGroupService.create_group(
        name: "Test group",
        ticket_ids: [ticket1.id, ticket2.id],
        primary_ticket_id: ticket1.id
      )
    end

    it "adds tickets to the group" do
      post "/api/ticket_groups/#{group.id}/add_tickets", params: { ticket_ids: [ticket3.id] }
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["tickets"].length).to eq(3)
    end
  end

  describe "DELETE /api/ticket_groups/:id/remove_ticket" do
    let!(:ticket3) { create(:ticket, reporter: reporter) }
    let!(:group) do
      TicketGroupService.create_group(
        name: "Test group",
        ticket_ids: [ticket1.id, ticket2.id, ticket3.id],
        primary_ticket_id: ticket1.id
      )
    end

    it "removes a ticket from the group" do
      delete "/api/ticket_groups/#{group.id}/remove_ticket", params: { ticket_id: ticket3.id }
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["tickets"].length).to eq(2)
    end

    it "dissolves the group when fewer than 2 remain" do
      delete "/api/ticket_groups/#{group.id}/remove_ticket", params: { ticket_id: ticket3.id }
      delete "/api/ticket_groups/#{group.id}/remove_ticket", params: { ticket_id: ticket2.id }
      body = JSON.parse(response.body)
      expect(body["dissolved"]).to be true
    end
  end

  describe "POST /api/ticket_groups/suggest" do
    let(:openai_response) do
      {
        choices: [{
          message: {
            content: {
              groups: [{
                name: "Login Outage",
                reason: "Both tickets report login issues",
                ticket_ids: [ticket1.id, ticket2.id]
              }]
            }.to_json
          }
        }]
      }.to_json
    end

    before do
      stub_request(:post, "https://api.openai.com/v1/chat/completions")
        .to_return(status: 200, body: openai_response, headers: { "Content-Type" => "application/json" })
    end

    it "returns AI grouping suggestions" do
      post "/api/ticket_groups/suggest", params: { hours_ago: 24 }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["suggestions"].length).to eq(1)
      expect(body["suggestions"].first["name"]).to eq("Login Outage")
      expect(body["ticket_count"]).to eq(2)
    end

    it "uses default hours_ago of 4" do
      post "/api/ticket_groups/suggest"

      expect(response).to have_http_status(:ok)
    end

    it "returns 422 when OpenAI fails" do
      stub_request(:post, "https://api.openai.com/v1/chat/completions")
        .to_return(status: 500, body: '{"error":"fail"}')

      post "/api/ticket_groups/suggest", params: { hours_ago: 24 }

      expect(response).to have_http_status(:unprocessable_entity)
      body = JSON.parse(response.body)
      expect(body["error"]).to include("500")
    end
  end

  describe "POST /api/ticket_groups/simulate_incident" do
    before do
      stub_request(:post, "http://localhost:3000/webhooks/whatsapp")
        .to_return(status: 200, body: '{"status":"ok"}')
      stub_request(:post, "http://localhost:3000/webhooks/slack")
        .to_return(status: 200, body: '{"status":"ok"}')
    end

    it "runs the incident simulation and returns success" do
      post "/api/ticket_groups/simulate_incident"

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["message"]).to eq("Incident simulation complete")
      expect(body["ticket_count"]).to eq(8)
    end

    it "makes 8 webhook posts" do
      post "/api/ticket_groups/simulate_incident"

      expect(WebMock).to have_requested(:post, "http://localhost:3000/webhooks/whatsapp").times(5)
      expect(WebMock).to have_requested(:post, "http://localhost:3000/webhooks/slack").times(3)
    end
  end

  describe "POST /api/ticket_groups/:id/resolve" do
    let!(:entry1) { create(:changelog_entry, :approved, ticket: ticket1) }
    let!(:entry2) { create(:changelog_entry, :approved, ticket: ticket2) }
    let!(:group) do
      TicketGroupService.create_group(
        name: "Test group",
        ticket_ids: [ticket1.id, ticket2.id],
        primary_ticket_id: ticket1.id
      )
    end

    it "resolves the group and all tickets" do
      post "/api/ticket_groups/#{group.id}/resolve", params: { channel: "slack", resolution_note: "All fixed" }
      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["status"]).to eq("resolved")
      expect(body["resolved_via_channel"]).to eq("slack")
      expect(ticket1.reload.status).to eq("resolved")
      expect(ticket2.reload.status).to eq("resolved")
    end

    it "returns 422 if already resolved" do
      post "/api/ticket_groups/#{group.id}/resolve", params: { channel: "slack" }
      post "/api/ticket_groups/#{group.id}/resolve", params: { channel: "slack" }
      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
