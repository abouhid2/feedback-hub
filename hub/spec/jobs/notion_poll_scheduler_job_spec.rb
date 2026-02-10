require "rails_helper"

RSpec.describe NotionPollSchedulerJob, type: :job do
  describe "#perform" do
    it "delegates to NotionPollService.poll" do
      allow(NotionPollService).to receive(:poll)
      described_class.perform_now
      expect(NotionPollService).to have_received(:poll)
    end

    it "reschedules itself after completion" do
      allow(NotionPollService).to receive(:poll)
      described_class.perform_now
      expect(NotionPollSchedulerJob).to have_been_enqueued
    end

    it "reschedules even if poll raises an error" do
      allow(NotionPollService).to receive(:poll).and_raise(StandardError, "API down")
      begin
        described_class.perform_now
      rescue StandardError
        # expected
      end
      expect(NotionPollSchedulerJob).to have_been_enqueued
    end
  end
end
