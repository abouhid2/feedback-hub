require "rails_helper"

RSpec.describe NotificationDispatchService, type: :service do
  let(:reporter) { create(:reporter) }
  let!(:identity) { create(:reporter_identity, reporter: reporter, platform: "slack", platform_user_id: "U123ABC") }
  let(:ticket) { create(:ticket, :resolved, reporter: reporter, original_channel: "slack") }
  let(:entry) { create(:changelog_entry, :approved, ticket: ticket) }

  describe ".call" do
    before do
      allow(ENV).to receive(:[]).and_call_original
      allow(ENV).to receive(:[]).with("SLACK_BOT_TOKEN").and_return("xoxb-test-token")

      stub_request(:post, "https://slack.com/api/chat.postMessage")
        .to_return(status: 200, body: '{"ok":true}', headers: { "Content-Type" => "application/json" })
    end

    it "creates a notification record linked to ticket and changelog_entry" do
      notification = described_class.call(entry)
      expect(notification.ticket).to eq(ticket)
      expect(notification.changelog_entry).to eq(entry)
    end

    it "sets channel to ticket's original_channel" do
      notification = described_class.call(entry)
      expect(notification.channel).to eq("slack")
    end

    it "sets recipient from reporter identity" do
      notification = described_class.call(entry)
      expect(notification.recipient).to eq("U123ABC")
    end

    it "marks sent and sets delivered_at on success" do
      notification = described_class.call(entry)
      expect(notification.status).to eq("sent")
      expect(notification.delivered_at).to be_present
    end

    it "creates notification_sent event" do
      expect { described_class.call(entry) }
        .to change { ticket.ticket_events.where(event_type: "notification_sent").count }.by(1)
    end

    context "when platform API fails" do
      before do
        stub_request(:post, "https://slack.com/api/chat.postMessage")
          .to_return(status: 500, body: '{"ok":false,"error":"server_error"}')
      end

      it "marks notification as failed" do
        notification = described_class.call(entry)
        expect(notification.status).to eq("failed")
      end

      it "increments retry_count and stores last_error" do
        notification = described_class.call(entry)
        expect(notification.retry_count).to eq(1)
        expect(notification.last_error).to be_present
      end

      it "enqueues NotificationRetryJob" do
        described_class.call(entry)
        expect(NotificationRetryJob).to have_been_enqueued
      end

      it "creates notification_failed event" do
        expect { described_class.call(entry) }
          .to change { ticket.ticket_events.where(event_type: "notification_failed").count }.by(1)
      end
    end

    context "when reporter has no identity on the channel" do
      let(:ticket) { create(:ticket, :resolved, reporter: reporter, original_channel: "intercom") }

      it "raises NoIdentityFound error" do
        expect { described_class.call(entry) }
          .to raise_error(NotificationDispatchService::NoIdentityFound)
      end
    end

    context "when changelog_entry is not approved" do
      let(:draft_entry) { create(:changelog_entry, ticket: ticket, status: "draft") }

      it "raises NotApproved error" do
        expect { described_class.call(draft_entry) }
          .to raise_error(NotificationDispatchService::NotApproved)
      end
    end

    context "when batch scenario applies (>5 approved in 5min window)" do
      before do
        # Create 6 approved entries within the batch window to trigger batch mode
        6.times do
          t = create(:ticket, :resolved, reporter: reporter, original_channel: "slack")
          create(:changelog_entry, :approved, ticket: t, approved_at: 1.minute.ago)
        end
      end

      it "creates notification with pending_batch_review status" do
        notification = described_class.call(entry)
        expect(notification.status).to eq("pending_batch_review")
      end

      it "does not deliver the notification" do
        expect_any_instance_of(described_class).not_to receive(:deliver)
        described_class.call(entry)
      end
    end

    context "when batch threshold is not met" do
      before do
        # Only 3 approved entries — below threshold
        3.times do
          t = create(:ticket, :resolved, reporter: reporter, original_channel: "slack")
          create(:changelog_entry, :approved, ticket: t, approved_at: 1.minute.ago)
        end
      end

      it "creates notification with pending status and delivers" do
        notification = described_class.call(entry)
        expect(notification.status).to eq("sent")
      end
    end
  end
end
