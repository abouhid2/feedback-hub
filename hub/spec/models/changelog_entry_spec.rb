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

  describe "scopes" do
    let!(:draft_entry) { create(:changelog_entry, status: "draft") }
    let!(:approved_entry) { create(:changelog_entry, :approved) }

    it ".drafts returns only drafts, .approved returns only approved" do
      expect(ChangelogEntry.drafts).to contain_exactly(draft_entry)
      expect(ChangelogEntry.approved).to contain_exactly(approved_entry)
    end
  end
end
