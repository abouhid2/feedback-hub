require "rails_helper"

RSpec.describe NotionSyncService, type: :service do
  let(:ticket) { create(:ticket, title: "Login broken", priority: 2, ticket_type: "bug", status: "open", original_channel: "slack") }

  let(:notion_create_response) do
    { "id" => "notion-page-abc123", "url" => "https://www.notion.so/page-abc123" }
  end

  let(:notion_update_response) do
    { "id" => "existing-page-id", "url" => "https://www.notion.so/existing-page-id" }
  end

  before do
    stub_request(:post, "https://api.notion.com/v1/pages")
      .to_return(status: 200, body: notion_create_response.to_json, headers: { "Content-Type" => "application/json" })

    stub_request(:patch, %r{https://api.notion.com/v1/pages/.+})
      .to_return(status: 200, body: notion_update_response.to_json, headers: { "Content-Type" => "application/json" })
  end

  describe ".push" do
    it "creates a Notion page via API" do
      described_class.push(ticket)
      expect(WebMock).to have_requested(:post, "https://api.notion.com/v1/pages")
    end

    it "stores notion_page_id on the ticket" do
      described_class.push(ticket)
      expect(ticket.reload.notion_page_id).to eq("notion-page-abc123")
    end

    it "creates synced_to_notion event" do
      expect { described_class.push(ticket) }
        .to change { ticket.ticket_events.where(event_type: "synced_to_notion").count }.by(1)
    end

    it "maps ticket fields to Notion properties" do
      described_class.push(ticket)

      expect(WebMock).to have_requested(:post, "https://api.notion.com/v1/pages")
        .with { |req|
          body = JSON.parse(req.body)
          props = body["properties"]
          props["Title"].present? && props["Priority"].present? && props["Status"].present? && props["Channel"].present?
        }
    end

    context "when notion_page_id already set" do
      let(:ticket) { create(:ticket, notion_page_id: "existing-page-id") }

      it "updates existing page with PATCH" do
        described_class.push(ticket)
        expect(WebMock).to have_requested(:patch, "https://api.notion.com/v1/pages/existing-page-id")
      end
    end

    context "when Notion API fails" do
      before do
        stub_request(:post, "https://api.notion.com/v1/pages")
          .to_return(status: 400, body: '{"object":"error","message":"Invalid request"}')
      end

      it "raises ApiError" do
        expect { described_class.push(ticket) }
          .to raise_error(NotionSyncService::ApiError)
      end

      it "does not update notion_page_id" do
        begin
          described_class.push(ticket)
        rescue NotionSyncService::ApiError
          # expected
        end
        expect(ticket.reload.notion_page_id).to be_nil
      end
    end
  end
end
