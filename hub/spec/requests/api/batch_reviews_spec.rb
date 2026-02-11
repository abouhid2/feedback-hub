require "rails_helper"

RSpec.describe "Api::BatchReviews", type: :request do
  let(:reporter) { create(:reporter) }
  let!(:identity) { create(:reporter_identity, reporter: reporter, platform: "slack", platform_user_id: "U123ABC") }
  let(:ticket) { create(:ticket, :resolved, reporter: reporter, original_channel: "slack") }
  let(:entry) { create(:changelog_entry, :approved, ticket: ticket) }

  before do
    stub_request(:post, "https://slack.com/api/chat.postMessage")
      .to_return(status: 200, body: '{"ok":true}', headers: { "Content-Type" => "application/json" })
  end

  describe "GET /api/batch_reviews/pending" do
    let!(:pending_batch) { create_list(:notification, 3, :pending_batch_review, ticket: ticket, changelog_entry: entry) }
    let!(:regular) { create(:notification, ticket: ticket, status: "pending") }

    it "returns only pending_batch_review notifications" do
      get "/api/batch_reviews/pending"

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.length).to eq(3)
      body.each { |n| expect(n["status"]).to eq("pending_batch_review") }
    end
  end

  describe "POST /api/batch_reviews/approve_all" do
    let!(:notifications) { create_list(:notification, 3, :pending_batch_review, ticket: ticket, changelog_entry: entry) }

    it "transitions all pending_batch_review and delivers them" do
      ids = notifications.map(&:id)

      post "/api/batch_reviews/approve_all", params: { notification_ids: ids }

      expect(response).to have_http_status(:ok)
      notifications.each { |n| expect(%w[pending sent]).to include(n.reload.status) }
    end
  end

  describe "POST /api/batch_reviews/approve_selected" do
    let!(:notifications) { create_list(:notification, 3, :pending_batch_review, ticket: ticket, changelog_entry: entry) }

    it "approves only the selected notifications" do
      selected = [notifications.first.id, notifications.second.id]

      post "/api/batch_reviews/approve_selected", params: { notification_ids: selected }

      expect(response).to have_http_status(:ok)
      expect(%w[pending sent]).to include(notifications.first.reload.status)
      expect(%w[pending sent]).to include(notifications.second.reload.status)
      expect(notifications.third.reload.status).to eq("pending_batch_review")
    end
  end

  describe "POST /api/batch_reviews/reject_all" do
    let!(:notifications) { create_list(:notification, 3, :pending_batch_review, ticket: ticket, changelog_entry: entry) }

    it "marks all as failed with batch_rejected" do
      ids = notifications.map(&:id)

      post "/api/batch_reviews/reject_all", params: { notification_ids: ids }

      expect(response).to have_http_status(:ok)
      notifications.each do |n|
        expect(n.reload.status).to eq("failed")
        expect(n.reload.last_error).to eq("batch_rejected")
      end
    end
  end
end
