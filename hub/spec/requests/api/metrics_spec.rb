require "rails_helper"

RSpec.describe "Api::Metrics", type: :request do
  before do
    # Slack tickets
    create_list(:ticket, 3, original_channel: "slack", ticket_type: "bug", status: "open")
    create_list(:ticket, 2, original_channel: "slack", ticket_type: "feature_request", status: "resolved")

    # Intercom tickets
    create(:ticket, :from_intercom, ticket_type: "question", status: "resolved")

    # WhatsApp tickets
    create(:ticket, :from_whatsapp, ticket_type: "bug", status: "closed")

    # Reporter with multiple tickets
    reporter = create(:reporter, name: "Top Reporter")
    create_list(:ticket, 4, reporter: reporter, original_channel: "slack")
  end

  describe "GET /api/metrics/summary" do
    it "returns ticket counts by channel" do
      get "/api/metrics/summary"

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      by_channel = body["by_channel"]
      expect(by_channel["slack"]).to eq(9)
      expect(by_channel["intercom"]).to eq(1)
      expect(by_channel["whatsapp"]).to eq(1)
    end

    it "returns ticket counts by type" do
      get "/api/metrics/summary"

      body = JSON.parse(response.body)
      by_type = body["by_type"]
      expect(by_type["bug"]).to eq(8)
      expect(by_type["feature_request"]).to eq(2)
      expect(by_type["question"]).to eq(1)
    end

    it "returns ticket counts by status" do
      get "/api/metrics/summary"

      body = JSON.parse(response.body)
      by_status = body["by_status"]
      expect(by_status["open"]).to eq(7)
      expect(by_status["resolved"]).to eq(3)
      expect(by_status["closed"]).to eq(1)
    end

    it "returns top reporters" do
      get "/api/metrics/summary"

      body = JSON.parse(response.body)
      top = body["top_reporters"]
      expect(top.first["name"]).to eq("Top Reporter")
      expect(top.first["ticket_count"]).to eq(4)
    end

    it "returns total ticket count" do
      get "/api/metrics/summary"

      body = JSON.parse(response.body)
      expect(body["total"]).to eq(11)
    end
  end
end
