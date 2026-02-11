require "rails_helper"

RSpec.describe NotionPollService, type: :service do
  let!(:ticket) { create(:ticket, status: "open", notion_page_id: "page-abc") }

  let(:notion_query_response) do
    {
      "results" => [
        {
          "id" => "page-abc",
          "last_edited_time" => Time.current.iso8601,
          "properties" => {
            "Status" => { "select" => { "name" => "Done" } }
          }
        }
      ],
      "has_more" => false
    }
  end

  let(:empty_query_response) do
    { "results" => [], "has_more" => false }
  end

  before do
    stub_request(:post, "https://api.notion.com/v1/databases/test-db-id/query")
      .to_return(status: 200, body: notion_query_response.to_json, headers: { "Content-Type" => "application/json" })

    allow(ENV).to receive(:fetch).and_call_original
    allow(ENV).to receive(:fetch).with("NOTION_DATABASE_ID", anything).and_return("test-db-id")
  end

  describe ".poll" do
    it "queries Notion for recently modified pages" do
      described_class.poll
      expect(WebMock).to have_requested(:post, "https://api.notion.com/v1/databases/test-db-id/query")
    end

    it "updates ticket status when Notion changes to Done" do
      described_class.poll
      expect(ticket.reload.status).to eq("resolved")
    end

    it "creates status_changed event with actor_type notion_sync" do
      expect { described_class.poll }
        .to change { ticket.ticket_events.where(event_type: "status_changed").count }.by(1)

      event = ticket.ticket_events.where(event_type: "status_changed").last
      expect(event.actor_type).to eq("notion_sync")
    end

    it "does not auto-enqueue ChangelogGeneratorJob (user-initiated only)" do
      described_class.poll
      expect(ChangelogGeneratorJob).not_to have_been_enqueued
    end

    it "updates last_poll_timestamp in Rails.cache" do
      memory_store = ActiveSupport::Cache::MemoryStore.new
      allow(Rails).to receive(:cache).and_return(memory_store)
      described_class.poll
      expect(Rails.cache.read("notion_poll:last_timestamp")).to be_present
    end

    context "when no pages modified" do
      before do
        stub_request(:post, "https://api.notion.com/v1/databases/test-db-id/query")
          .to_return(status: 200, body: empty_query_response.to_json, headers: { "Content-Type" => "application/json" })
      end

      it "skips without errors" do
        expect { described_class.poll }.not_to raise_error
      end
    end

    context "when ticket already resolved" do
      let!(:ticket) { create(:ticket, :resolved, notion_page_id: "page-abc") }

      it "skips resolved tickets" do
        expect { described_class.poll }
          .not_to change { ticket.reload.updated_at }
      end
    end

    context "when Notion returns 429 rate limit" do
      before do
        stub_request(:post, "https://api.notion.com/v1/databases/test-db-id/query")
          .to_return(status: 429, body: '{"object":"error","message":"Rate limited"}', headers: { "Retry-After" => "3" })
      end

      it "raises RateLimitError with retry_after" do
        expect { described_class.poll }
          .to raise_error(NotionPollService::RateLimitError) { |e| expect(e.retry_after).to eq(3) }
      end
    end

    context "with multiple status changes in one poll" do
      let!(:ticket2) { create(:ticket, status: "open", notion_page_id: "page-xyz") }

      let(:multi_page_response) do
        {
          "results" => [
            { "id" => "page-abc", "properties" => { "Status" => { "select" => { "name" => "Done" } } } },
            { "id" => "page-xyz", "properties" => { "Status" => { "select" => { "name" => "In Progress" } } } }
          ],
          "has_more" => false
        }
      end

      before do
        stub_request(:post, "https://api.notion.com/v1/databases/test-db-id/query")
          .to_return(status: 200, body: multi_page_response.to_json, headers: { "Content-Type" => "application/json" })
      end

      it "processes all changed pages" do
        described_class.poll
        expect(ticket.reload.status).to eq("resolved")
        expect(ticket2.reload.status).to eq("in_progress")
      end
    end
  end
end
