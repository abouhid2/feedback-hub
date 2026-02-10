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
  end
end
