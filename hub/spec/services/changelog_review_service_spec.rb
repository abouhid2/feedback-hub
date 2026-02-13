require "rails_helper"

RSpec.describe ChangelogReviewService, type: :service do
  let(:ticket) { create(:ticket, :resolved) }
  let(:entry) { create(:changelog_entry, ticket: ticket, status: "draft") }

  describe ".approve" do
    it "sets status to approved" do
      result = described_class.approve(entry, approved_by: "admin@example.com")
      expect(result.status).to eq("approved")
    end

    it "records approved_by and approved_at" do
      freeze_time do
        result = described_class.approve(entry, approved_by: "admin@example.com")
        expect(result.approved_by).to eq("admin@example.com")
        expect(result.approved_at).to eq(Time.current)
      end
    end

    it "creates a changelog_approved ticket event" do
      expect { described_class.approve(entry, approved_by: "admin@example.com") }
        .to change { ticket.ticket_events.where(event_type: "changelog_approved").count }.by(1)
    end

    it "enqueues NotificationDispatchJob" do
      described_class.approve(entry, approved_by: "admin@example.com")
      expect(NotificationDispatchJob).to have_been_enqueued.with(entry.id)
    end

    it "raises InvalidTransition if entry is not draft" do
      approved_entry = create(:changelog_entry, :approved, ticket: ticket)
      expect { described_class.approve(approved_entry, approved_by: "admin@example.com") }
        .to raise_error(ChangelogReviewService::InvalidTransition)
    end
  end

  describe ".update_draft" do
    it "updates content of a draft entry" do
      result = described_class.update_draft(entry, new_content: "Updated message for the user.")
      expect(result.content).to eq("Updated message for the user.")
    end

    it "raises InvalidTransition if entry is not draft" do
      approved_entry = create(:changelog_entry, :approved, ticket: ticket)
      expect { described_class.update_draft(approved_entry, new_content: "New content") }
        .to raise_error(ChangelogReviewService::InvalidTransition)
    end
  end
end
