require "rails_helper"

RSpec.describe NotionSyncJob, type: :job do
  let(:ticket) { create(:ticket) }

  describe "#perform" do
    it "delegates to NotionSyncService.push" do
      expect(NotionSyncService).to receive(:push).with(ticket)
      described_class.new.perform(ticket.id)
    end

    it "discards gracefully if ticket not found" do
      expect { described_class.new.perform(SecureRandom.uuid) }.not_to raise_error
    end

    it "retries on RateLimitError" do
      allow(NotionSyncService).to receive(:push).and_raise(
        NotionSyncService::RateLimitError.new(retry_after: 5)
      )

      expect {
        described_class.perform_now(ticket.id)
      }.to have_enqueued_job(described_class)
    end

    it "retries on ApiError" do
      allow(NotionSyncService).to receive(:push).and_raise(
        NotionSyncService::ApiError, "Notion API error: 500"
      )

      expect {
        described_class.perform_now(ticket.id)
      }.to have_enqueued_job(described_class)
    end
  end
end
