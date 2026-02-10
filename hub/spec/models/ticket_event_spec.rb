require "rails_helper"

RSpec.describe TicketEvent, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:ticket) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:event_type) }
  end

  describe "event types" do
    let(:ticket) { create(:ticket) }

    # Original event types
    %w[created status_changed priority_changed commented assigned merged].each do |event_type|
      it "accepts original event type: #{event_type}" do
        event = build(:ticket_event, ticket: ticket, event_type: event_type)
        expect(event).to be_valid
      end
    end

    # New event types for features
    %w[changelog_drafted changelog_approved changelog_rejected notification_sent notification_failed synced_to_notion].each do |event_type|
      it "accepts new event type: #{event_type}" do
        event = build(:ticket_event, ticket: ticket, event_type: event_type)
        expect(event).to be_valid
      end
    end

    it "rejects invalid event types" do
      event = build(:ticket_event, ticket: ticket, event_type: "invalid_event")
      expect(event).not_to be_valid
    end
  end
end
