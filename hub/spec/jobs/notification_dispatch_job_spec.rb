require "rails_helper"

RSpec.describe NotificationDispatchJob, type: :job do
  let(:ticket) { create(:ticket, :resolved) }
  let(:entry) { create(:changelog_entry, :approved, ticket: ticket) }

  describe "#perform" do
    it "delegates to NotificationDispatchService.call" do
      expect(NotificationDispatchService).to receive(:call).with(entry)
      described_class.new.perform(entry.id)
    end

    it "discards gracefully if changelog_entry not found" do
      expect { described_class.new.perform(SecureRandom.uuid) }.not_to raise_error
    end
  end
end
