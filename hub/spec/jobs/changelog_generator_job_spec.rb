require "rails_helper"

RSpec.describe ChangelogGeneratorJob, type: :job do
  let(:ticket) { create(:ticket, :resolved) }

  describe "#perform" do
    it "delegates to ChangelogGeneratorService.call" do
      expect(ChangelogGeneratorService).to receive(:call).with(ticket)
      described_class.new.perform(ticket.id)
    end

    it "discards gracefully if ticket not found" do
      expect { described_class.new.perform(SecureRandom.uuid) }.not_to raise_error
    end
  end
end
