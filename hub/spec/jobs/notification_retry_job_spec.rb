require "rails_helper"

RSpec.describe NotificationRetryJob, type: :job do
  let(:ticket) { create(:ticket, :resolved) }
  let(:entry) { create(:changelog_entry, :approved, ticket: ticket) }
  let(:notification) { create(:notification, :failed, ticket: ticket, changelog_entry: entry) }

  describe "#perform" do
    it "delegates to NotificationDispatchService.retry_notification" do
      expect(NotificationDispatchService).to receive(:retry_notification).with(notification)
      described_class.new.perform(notification.id)
    end

    it "discards gracefully if notification not found" do
      expect { described_class.new.perform(SecureRandom.uuid) }.not_to raise_error
    end
  end
end
