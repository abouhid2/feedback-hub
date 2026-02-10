require "rails_helper"

RSpec.describe NotionPollJob, type: :job do
  describe "#perform" do
    it "delegates to NotionPollService.poll" do
      expect(NotionPollService).to receive(:poll)
      described_class.new.perform
    end
  end
end
