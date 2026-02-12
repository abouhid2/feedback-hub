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

    context "when retry count exceeds MAX_RETRIES" do
      let(:notification) do
        create(:notification, :failed, ticket: ticket, changelog_entry: entry,
          retry_count: NotificationRetryJob::MAX_RETRIES)
      end

      it "marks notification as permanently_failed" do
        described_class.new.perform(notification.id)
        notification.reload
        expect(notification.status).to eq("permanently_failed")
        expect(notification.last_error).to include("Max retries")
      end

      it "does not call retry_notification" do
        expect(NotificationDispatchService).not_to receive(:retry_notification)
        described_class.new.perform(notification.id)
      end

      it "creates a notification_failed event" do
        expect {
          described_class.new.perform(notification.id)
        }.to change { ticket.ticket_events.where(event_type: "notification_failed").count }.by(1)
      end
    end

    context "when retry count is below MAX_RETRIES" do
      let(:notification) do
        create(:notification, :failed, ticket: ticket, changelog_entry: entry,
          retry_count: NotificationRetryJob::MAX_RETRIES - 1)
      end

      it "retries the notification" do
        expect(NotificationDispatchService).to receive(:retry_notification).with(notification)
        described_class.new.perform(notification.id)
      end
    end
  end
end
