require "rails_helper"

RSpec.describe BatchReviewService, type: :service do
  describe ".should_batch?" do
    it "returns true when more than 5 entries created within 5 minutes" do
      entries = create_list(:changelog_entry, 6)
      expect(described_class.should_batch?(entries)).to be true
    end

    it "returns false when 5 or fewer entries" do
      entries = create_list(:changelog_entry, 5)
      expect(described_class.should_batch?(entries)).to be false
    end

    it "returns false when entries are spread over more than 5 minutes" do
      old_entries = []
      travel_to(10.minutes.ago) do
        old_entries = create_list(:changelog_entry, 3)
      end
      recent_entries = create_list(:changelog_entry, 3)
      all_entries = old_entries + recent_entries
      expect(described_class.should_batch?(all_entries)).to be false
    end
  end

  describe ".approve_all" do
    let(:ticket) { create(:ticket, :resolved) }
    let(:entry) { create(:changelog_entry, :approved, ticket: ticket) }
    let!(:notifications) do
      create_list(:notification, 3, :pending_batch_review, ticket: ticket, changelog_entry: entry)
    end

    it "transitions pending_batch_review notifications to pending" do
      described_class.approve_all(notifications)
      notifications.each do |n|
        expect(n.reload.status).to eq("pending")
      end
    end

    it "enqueues dispatch jobs for each notification" do
      described_class.approve_all(notifications)
      expect(NotificationDispatchJob).to have_been_enqueued.exactly(3).times
    end
  end

  describe ".approve_selected" do
    let(:ticket) { create(:ticket, :resolved) }
    let(:entry) { create(:changelog_entry, :approved, ticket: ticket) }
    let!(:notifications) do
      create_list(:notification, 3, :pending_batch_review, ticket: ticket, changelog_entry: entry)
    end

    it "approves only selected notifications" do
      selected_ids = [notifications.first.id, notifications.second.id]
      described_class.approve_selected(selected_ids)

      expect(notifications.first.reload.status).to eq("pending")
      expect(notifications.second.reload.status).to eq("pending")
      expect(notifications.third.reload.status).to eq("pending_batch_review")
    end
  end

  describe ".reject_all" do
    let(:ticket) { create(:ticket, :resolved) }
    let(:entry) { create(:changelog_entry, :approved, ticket: ticket) }
    let!(:notifications) do
      create_list(:notification, 3, :pending_batch_review, ticket: ticket, changelog_entry: entry)
    end

    it "marks all as failed with batch_rejected error" do
      described_class.reject_all(notifications)
      notifications.each do |n|
        expect(n.reload.status).to eq("failed")
        expect(n.reload.last_error).to eq("batch_rejected")
      end
    end
  end
end
