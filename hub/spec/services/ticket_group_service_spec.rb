require "rails_helper"

RSpec.describe TicketGroupService, type: :service do
  let(:reporter) { create(:reporter) }
  let!(:identity) { create(:reporter_identity, reporter: reporter, platform: "slack", platform_user_id: "U123ABC") }

  describe ".create_group" do
    let!(:ticket1) { create(:ticket, reporter: reporter, original_channel: "slack") }
    let!(:ticket2) { create(:ticket, reporter: reporter, original_channel: "whatsapp") }

    it "creates a group with the given tickets" do
      group = described_class.create_group(
        name: "Duplicate login bug",
        ticket_ids: [ticket1.id, ticket2.id],
        primary_ticket_id: ticket1.id
      )

      expect(group).to be_persisted
      expect(group.name).to eq("Duplicate login bug")
      expect(group.status).to eq("open")
      expect(group.tickets).to contain_exactly(ticket1, ticket2)
      expect(group.primary_ticket).to eq(ticket1)
    end

    it "creates ticket_grouped events for each ticket" do
      expect {
        described_class.create_group(
          name: "Group",
          ticket_ids: [ticket1.id, ticket2.id],
          primary_ticket_id: ticket1.id
        )
      }.to change { TicketEvent.where(event_type: "ticket_grouped").count }.by(2)
    end

    it "raises InvalidGroup when fewer than 2 tickets" do
      expect {
        described_class.create_group(
          name: "Group",
          ticket_ids: [ticket1.id],
          primary_ticket_id: ticket1.id
        )
      }.to raise_error(TicketGroupService::InvalidGroup, /at least 2/)
    end

    it "raises InvalidGroup when primary ticket is not in the group" do
      ticket3 = create(:ticket)
      expect {
        described_class.create_group(
          name: "Group",
          ticket_ids: [ticket1.id, ticket2.id],
          primary_ticket_id: ticket3.id
        )
      }.to raise_error(TicketGroupService::InvalidGroup, /primary ticket must be/)
    end

    it "raises AlreadyGrouped when a ticket is already in another group" do
      other_group = create(:ticket_group)
      ticket1.update!(ticket_group: other_group)

      expect {
        described_class.create_group(
          name: "Group",
          ticket_ids: [ticket1.id, ticket2.id],
          primary_ticket_id: ticket2.id
        )
      }.to raise_error(TicketGroupService::AlreadyGrouped)
    end
  end

  describe ".add_tickets" do
    let!(:ticket1) { create(:ticket, reporter: reporter) }
    let!(:ticket2) { create(:ticket, reporter: reporter) }
    let!(:ticket3) { create(:ticket, reporter: reporter) }
    let!(:group) do
      described_class.create_group(
        name: "Test",
        ticket_ids: [ticket1.id, ticket2.id],
        primary_ticket_id: ticket1.id
      )
    end

    it "adds tickets to the group" do
      described_class.add_tickets(group, [ticket3.id])
      expect(group.tickets.reload).to include(ticket3)
    end

    it "creates ticket_grouped events for newly added tickets" do
      expect {
        described_class.add_tickets(group, [ticket3.id])
      }.to change { TicketEvent.where(event_type: "ticket_grouped").count }.by(1)
    end

    it "raises AlreadyGrouped if a ticket is in another group" do
      other_group = create(:ticket_group)
      ticket3.update!(ticket_group: other_group)

      expect {
        described_class.add_tickets(group, [ticket3.id])
      }.to raise_error(TicketGroupService::AlreadyGrouped)
    end
  end

  describe ".remove_ticket" do
    let!(:ticket1) { create(:ticket, reporter: reporter) }
    let!(:ticket2) { create(:ticket, reporter: reporter) }
    let!(:ticket3) { create(:ticket, reporter: reporter) }
    let!(:group) do
      described_class.create_group(
        name: "Test",
        ticket_ids: [ticket1.id, ticket2.id, ticket3.id],
        primary_ticket_id: ticket1.id
      )
    end

    it "removes a ticket from the group" do
      described_class.remove_ticket(group, ticket3.id)
      expect(group.tickets.reload).not_to include(ticket3)
      expect(ticket3.reload.ticket_group_id).to be_nil
    end

    it "dissolves the group if fewer than 2 remain" do
      described_class.remove_ticket(group, ticket3.id)
      result = described_class.remove_ticket(group, ticket2.id)
      expect(result).to eq(:dissolved)
      expect(ticket1.reload.ticket_group_id).to be_nil
      expect { group.reload }.to raise_error(ActiveRecord::RecordNotFound)
    end
  end

  describe ".resolve_group" do
    let!(:ticket1) { create(:ticket, reporter: reporter, original_channel: "slack") }
    let!(:ticket2) { create(:ticket, reporter: reporter, original_channel: "whatsapp") }
    let!(:entry1) { create(:changelog_entry, :approved, ticket: ticket1) }
    let!(:entry2) { create(:changelog_entry, :approved, ticket: ticket2) }
    let!(:group) do
      described_class.create_group(
        name: "Test",
        ticket_ids: [ticket1.id, ticket2.id],
        primary_ticket_id: ticket1.id
      )
    end

    before do
      stub_request(:post, "https://slack.com/api/chat.postMessage")
        .to_return(status: 200, body: '{"ok":true}', headers: { "Content-Type" => "application/json" })
    end

    it "resolves all tickets in the group" do
      described_class.resolve_group(group: group, channel: "slack", resolution_note: "Fixed")
      expect(ticket1.reload.status).to eq("resolved")
      expect(ticket2.reload.status).to eq("resolved")
    end

    it "marks the group as resolved" do
      described_class.resolve_group(group: group, channel: "slack")
      group.reload
      expect(group.status).to eq("resolved")
      expect(group.resolved_via_channel).to eq("slack")
      expect(group.resolved_at).to be_present
    end

    it "creates group_resolved events for each ticket" do
      expect {
        described_class.resolve_group(group: group, channel: "slack")
      }.to change { TicketEvent.where(event_type: "group_resolved").count }.by(2)
    end

    it "sends one notification on the primary ticket" do
      expect {
        described_class.resolve_group(group: group, channel: "slack")
      }.to change { ticket1.notifications.count }.by(1)
    end

    it "does not send notifications on non-primary tickets" do
      described_class.resolve_group(group: group, channel: "slack")
      expect(ticket2.notifications.count).to eq(0)
    end

    it "raises AlreadyResolved if group is already resolved" do
      described_class.resolve_group(group: group, channel: "slack")
      expect {
        described_class.resolve_group(group: group.reload, channel: "slack")
      }.to raise_error(TicketGroupService::AlreadyResolved)
    end
  end
end
