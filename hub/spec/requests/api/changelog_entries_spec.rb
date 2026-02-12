require "rails_helper"

RSpec.describe "Api::ChangelogEntries", type: :request do
  let(:ticket) { create(:ticket, :resolved) }

  describe "GET /api/changelog_entries" do
    let!(:draft) { create(:changelog_entry, ticket: ticket, status: "draft", created_at: 1.hour.ago) }
    let!(:approved) { create(:changelog_entry, :approved, ticket: ticket, created_at: 30.minutes.ago) }
    let!(:rejected) { create(:changelog_entry, :rejected, ticket: ticket, created_at: 10.minutes.ago) }

    it "returns all entries ordered by created_at desc" do
      get "/api/changelog_entries"

      expect(response).to have_http_status(:ok)
      body = JSON.parse(response.body)
      expect(body.length).to eq(3)
      expect(body.first["id"]).to eq(rejected.id)
      expect(body.last["id"]).to eq(draft.id)
    end

    it "filters by status" do
      get "/api/changelog_entries", params: { status: "approved" }

      body = JSON.parse(response.body)
      expect(body.length).to eq(1)
      expect(body.first["status"]).to eq("approved")
    end

    it "includes nested ticket with reporter" do
      get "/api/changelog_entries"

      body = JSON.parse(response.body)
      entry = body.first
      expect(entry["ticket"]["id"]).to eq(ticket.id)
      expect(entry["ticket"]["title"]).to eq(ticket.title)
      expect(entry["ticket"]["reporter"]["name"]).to eq(ticket.reporter.name)
    end

    it "includes token counts" do
      get "/api/changelog_entries"

      body = JSON.parse(response.body)
      entry = body.first
      expect(entry).to have_key("ai_prompt_tokens")
      expect(entry).to have_key("ai_completion_tokens")
    end

    it "returns empty related_tickets when ticket has no group" do
      get "/api/changelog_entries"

      body = JSON.parse(response.body)
      body.each { |entry| expect(entry["related_tickets"]).to eq([]) }
    end

    context "when ticket belongs to a group" do
      let(:sibling_ticket) { create(:ticket, :resolved) }
      let!(:group) do
        TicketGroupService.create_group(
          name: "Test Group",
          ticket_ids: [ticket.id, sibling_ticket.id],
          primary_ticket_id: ticket.id
        )
      end

      it "includes sibling tickets in related_tickets" do
        get "/api/changelog_entries"

        body = JSON.parse(response.body)
        entry = body.first
        expect(entry["related_tickets"].length).to eq(1)
        expect(entry["related_tickets"].first["id"]).to eq(sibling_ticket.id)
        expect(entry["related_tickets"].first["title"]).to eq(sibling_ticket.title)
        expect(entry["related_tickets"].first["reporter"]["name"]).to eq(sibling_ticket.reporter.name)
      end

      it "does not include the entry's own ticket in related_tickets" do
        get "/api/changelog_entries"

        body = JSON.parse(response.body)
        entry = body.first
        related_ids = entry["related_tickets"].map { |t| t["id"] }
        expect(related_ids).not_to include(ticket.id)
      end
    end
  end
end
