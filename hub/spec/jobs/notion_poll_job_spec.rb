require "rails_helper"

RSpec.describe NotionPollJob, type: :job do
  describe "#perform" do
    it "delegates to NotionPollService.poll" do
      expect(NotionPollService).to receive(:poll)
      described_class.new.perform
    end

    it "retries on RateLimitError" do
      allow(NotionPollService).to receive(:poll).and_raise(
        NotionPollService::RateLimitError.new(retry_after: 5)
      )

      expect {
        described_class.perform_now
      }.to have_enqueued_job(described_class)
    end
  end
end
