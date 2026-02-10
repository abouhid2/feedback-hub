require "rails_helper"

RSpec.describe TicketEvent, type: :model do
  it { is_expected.to belong_to(:ticket) }
  it { is_expected.to validate_presence_of(:event_type) }

  it "rejects invalid event types" do
    event = build(:ticket_event, event_type: "invalid_event")
    expect(event).not_to be_valid
  end
end
