require "rails_helper"

RSpec.describe AutoGroupingService do
  let(:reporter) { create(:reporter) }

  # Helper: create a normalized embedding vector
  def make_embedding(seed)
    rng = Random.new(seed)
    vec = Array.new(1536) { rng.rand(-1.0..1.0) }
    magnitude = Math.sqrt(vec.sum { |v| v**2 })
    vec.map { |v| v / magnitude }
  end

  # Two similar embeddings (high cosine similarity)
  let(:base_embedding) { make_embedding(42) }
  let(:similar_embedding) do
    # Perturb slightly for high similarity
    noise = Array.new(1536) { rand(-0.01..0.01) }
    vec = base_embedding.each_with_index.map { |v, i| v + noise[i] }
    magnitude = Math.sqrt(vec.sum { |v| v**2 })
    vec.map { |v| v / magnitude }
  end
  let(:different_embedding) { make_embedding(999) }

  describe ".call" do
    context "when a similar ungrouped ticket exists" do
      let!(:existing_ticket) do
        create(:ticket, reporter: reporter, title: "Login is broken", ai_embedding: base_embedding, created_at: 1.hour.ago)
      end
      let!(:new_ticket) do
        create(:ticket, reporter: reporter, title: "Cannot log in", ai_embedding: similar_embedding)
      end

      it "creates a new group with both tickets" do
        result = described_class.call(new_ticket)

        expect(result).to be_a(TicketGroup)
        expect(result.tickets.count).to eq(2)
        expect(result.tickets).to include(new_ticket, existing_ticket)
        expect(result.name).to start_with("Auto:")
      end
    end

    context "when a similar ticket is already in a group" do
      let!(:existing_ticket) do
        create(:ticket, reporter: reporter, title: "Login is broken", ai_embedding: base_embedding, created_at: 1.hour.ago)
      end
      let!(:other_ticket) do
        create(:ticket, reporter: reporter, title: "Auth down", ai_embedding: base_embedding, created_at: 2.hours.ago)
      end
      let!(:group) do
        TicketGroupService.create_group(
          name: "Login Issues",
          ticket_ids: [existing_ticket.id, other_ticket.id],
          primary_ticket_id: existing_ticket.id
        )
      end
      let!(:new_ticket) do
        create(:ticket, reporter: reporter, title: "Cannot log in", ai_embedding: similar_embedding)
      end

      it "adds the new ticket to the existing group" do
        result = described_class.call(new_ticket)

        expect(result).to eq(group)
        expect(new_ticket.reload.ticket_group_id).to eq(group.id)
        expect(group.tickets.count).to eq(3)
      end
    end

    context "when no similar tickets exist" do
      let!(:existing_ticket) do
        create(:ticket, reporter: reporter, title: "Unrelated issue", ai_embedding: different_embedding, created_at: 1.hour.ago)
      end
      let!(:new_ticket) do
        create(:ticket, reporter: reporter, title: "Login broken", ai_embedding: base_embedding)
      end

      it "returns nil and does not create a group" do
        result = described_class.call(new_ticket)

        expect(result).to be_nil
        expect(TicketGroup.count).to eq(0)
      end
    end

    context "when the ticket has no embedding" do
      let!(:new_ticket) { create(:ticket, reporter: reporter, title: "No embedding") }

      it "returns nil" do
        expect(described_class.call(new_ticket)).to be_nil
      end
    end

    context "when the new ticket is already grouped" do
      let!(:existing_ticket) do
        create(:ticket, reporter: reporter, title: "Login broken", ai_embedding: base_embedding, created_at: 1.hour.ago)
      end
      let!(:other_ticket) do
        create(:ticket, reporter: reporter, title: "Auth issue", ai_embedding: base_embedding, created_at: 2.hours.ago)
      end
      let!(:new_ticket) do
        create(:ticket, reporter: reporter, title: "Cannot log in", ai_embedding: similar_embedding)
      end

      before do
        TicketGroupService.create_group(
          name: "Existing",
          ticket_ids: [new_ticket.id, other_ticket.id],
          primary_ticket_id: new_ticket.id
        )
      end

      it "returns nil without creating another group" do
        result = described_class.call(new_ticket)

        expect(result).to be_nil
        expect(TicketGroup.count).to eq(1)
      end
    end

    context "when candidates are outside the lookback window" do
      let!(:old_ticket) do
        create(:ticket, reporter: reporter, title: "Login broken", ai_embedding: base_embedding, created_at: 48.hours.ago)
      end
      let!(:new_ticket) do
        create(:ticket, reporter: reporter, title: "Cannot log in", ai_embedding: similar_embedding)
      end

      it "does not match tickets outside lookback hours" do
        result = described_class.call(new_ticket)

        expect(result).to be_nil
      end
    end
  end
end
