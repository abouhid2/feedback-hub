require "rails_helper"

RSpec.describe TicketGroup, type: :model do
  describe "validations" do
    it "requires a name" do
      group = build(:ticket_group, name: nil)
      expect(group).not_to be_valid
      expect(group.errors[:name]).to include("can't be blank")
    end

    it "requires status to be open or resolved" do
      group = build(:ticket_group, status: "invalid")
      expect(group).not_to be_valid
      expect(group.errors[:status]).to be_present
    end

    it "is valid with valid attributes" do
      group = build(:ticket_group)
      expect(group).to be_valid
    end
  end

  describe "associations" do
    it "has many tickets" do
      group = create(:ticket_group, :with_tickets, ticket_count: 3)
      expect(group.tickets.count).to eq(3)
    end

    it "nullifies tickets on destroy" do
      group = create(:ticket_group, :with_tickets)
      ticket = group.tickets.first
      group.destroy
      expect(ticket.reload.ticket_group_id).to be_nil
    end

    it "belongs to primary_ticket optionally" do
      group = create(:ticket_group)
      expect(group.primary_ticket).to be_nil
    end
  end

  describe "scopes" do
    let!(:open_group) { create(:ticket_group, status: "open") }
    let!(:resolved_group) { create(:ticket_group, :resolved) }

    it ".open_groups returns only open groups" do
      expect(described_class.open_groups).to include(open_group)
      expect(described_class.open_groups).not_to include(resolved_group)
    end

    it ".resolved_groups returns only resolved groups" do
      expect(described_class.resolved_groups).to include(resolved_group)
      expect(described_class.resolved_groups).not_to include(open_group)
    end

    it ".recent orders by created_at desc" do
      expect(described_class.recent.first).to eq(resolved_group)
    end
  end
end
