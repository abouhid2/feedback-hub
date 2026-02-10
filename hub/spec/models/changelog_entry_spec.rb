require "rails_helper"

RSpec.describe ChangelogEntry, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:ticket) }
    it { is_expected.to have_many(:notifications).dependent(:nullify) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:content) }
    it { is_expected.to validate_presence_of(:status) }
    it { is_expected.to validate_inclusion_of(:status).in_array(%w[draft approved rejected]) }
  end

  describe "defaults" do
    it "defaults status to draft" do
      entry = create(:changelog_entry)
      expect(entry.status).to eq("draft")
    end
  end

  describe "scopes" do
    let!(:draft_entry) { create(:changelog_entry, status: "draft") }
    let!(:approved_entry) { create(:changelog_entry, :approved) }
    let!(:rejected_entry) { create(:changelog_entry, :rejected) }

    describe ".drafts" do
      it "returns only draft entries" do
        expect(ChangelogEntry.drafts).to contain_exactly(draft_entry)
      end
    end

    describe ".approved" do
      it "returns only approved entries" do
        expect(ChangelogEntry.approved).to contain_exactly(approved_entry)
      end
    end
  end

  describe "status transitions" do
    let(:entry) { create(:changelog_entry) }

    it "can transition from draft to approved" do
      entry.update!(status: "approved", approved_by: "admin@test.com", approved_at: Time.current)
      expect(entry.reload.status).to eq("approved")
    end

    it "can transition from draft to rejected" do
      entry.update!(status: "rejected")
      expect(entry.reload.status).to eq("rejected")
    end
  end

  describe "AI tracking fields" do
    it "stores ai_model and token counts" do
      entry = create(:changelog_entry, ai_model: "gpt-4o-mini", ai_prompt_tokens: 200, ai_completion_tokens: 100)
      expect(entry.ai_model).to eq("gpt-4o-mini")
      expect(entry.ai_prompt_tokens).to eq(200)
      expect(entry.ai_completion_tokens).to eq(100)
    end
  end
end
