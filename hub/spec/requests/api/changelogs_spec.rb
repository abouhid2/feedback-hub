require "rails_helper"

RSpec.describe "Api::Tickets::Changelogs", type: :request do
  let(:reporter) { create(:reporter) }
  let(:ticket) { create(:ticket, :resolved, reporter: reporter) }

  describe "GET /api/tickets/:ticket_id/changelog" do
    let!(:entry) { create(:changelog_entry, ticket: ticket, content: "We fixed the login bug.") }

    it "returns the changelog entry with status and content" do
      get "/api/tickets/#{ticket.id}/changelog"

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["content"]).to eq("We fixed the login bug.")
      expect(body["status"]).to eq("draft")
    end

    it "returns not found when no entry exists" do
      get "/api/tickets/#{SecureRandom.uuid}/changelog"

      expect(response).to have_http_status(:not_found)
    end
  end

  describe "POST /api/tickets/:ticket_id/generate_changelog" do
    before do
      stub_request(:post, "https://api.openai.com/v1/chat/completions")
        .to_return(
          status: 200,
          body: {
            "choices" => [{ "message" => { "content" => "We resolved the issue." } }],
            "usage" => { "prompt_tokens" => 100, "completion_tokens" => 25 }
          }.to_json,
          headers: { "Content-Type" => "application/json" }
        )
    end

    it "creates a draft changelog entry and returns it" do
      post "/api/tickets/#{ticket.id}/generate_changelog"

      expect(response).to have_http_status(:created)
      body = JSON.parse(response.body)
      expect(body["status"]).to eq("draft")
      expect(body["content"]).to eq("We resolved the issue.")
    end

    it "returns unprocessable entity when ticket is not resolved" do
      open_ticket = create(:ticket, status: "open")

      post "/api/tickets/#{open_ticket.id}/generate_changelog"

      expect(response).to have_http_status(:unprocessable_entity)
      body = JSON.parse(response.body)
      expect(body["error"]).to be_present
    end
  end

  describe "PATCH /api/tickets/:ticket_id/approve_changelog" do
    let!(:entry) { create(:changelog_entry, ticket: ticket, status: "draft") }

    it "approves the entry and enqueues notification dispatch" do
      patch "/api/tickets/#{ticket.id}/approve_changelog", params: { approved_by: "admin@feedback-hub.com" }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["status"]).to eq("approved")
      expect(body["approved_by"]).to eq("admin@feedback-hub.com")
      expect(NotificationDispatchJob).to have_been_enqueued
    end

    it "returns unprocessable entity when entry is already approved" do
      entry.update!(status: "approved", approved_by: "someone", approved_at: Time.current)

      patch "/api/tickets/#{ticket.id}/approve_changelog", params: { approved_by: "admin@feedback-hub.com" }

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end

  describe "PATCH /api/tickets/:ticket_id/update_changelog_draft" do
    let!(:entry) { create(:changelog_entry, ticket: ticket, status: "draft", content: "Old content") }

    it "updates the draft content and returns it" do
      patch "/api/tickets/#{ticket.id}/update_changelog_draft", params: { content: "Updated changelog content" }

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body["content"]).to eq("Updated changelog content")
      expect(body["status"]).to eq("draft")
    end

    it "returns unprocessable entity when entry is not a draft" do
      entry.update!(status: "approved", approved_by: "someone", approved_at: Time.current)

      patch "/api/tickets/#{ticket.id}/update_changelog_draft", params: { content: "New content" }

      expect(response).to have_http_status(:unprocessable_entity)
    end
  end
end
