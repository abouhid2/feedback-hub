require "rails_helper"

RSpec.describe Ticket, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:reporter).optional }
    it { is_expected.to have_many(:ticket_sources).dependent(:destroy) }
    it { is_expected.to have_many(:ticket_events).dependent(:destroy) }
    it { is_expected.to have_many(:changelog_entries).dependent(:destroy) }
    it { is_expected.to have_many(:notifications).dependent(:destroy) }
    it { is_expected.to have_many(:attachments).dependent(:destroy) }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:title) }
    it { is_expected.to validate_presence_of(:ticket_type) }
    it { is_expected.to validate_presence_of(:status) }
    it { is_expected.to validate_presence_of(:original_channel) }
  end

  describe "notion_page_id" do
    it "stores notion_page_id" do
      ticket = create(:ticket, notion_page_id: "abc-123-def")
      expect(ticket.reload.notion_page_id).to eq("abc-123-def")
    end

    it "allows nil notion_page_id" do
      ticket = create(:ticket, notion_page_id: nil)
      expect(ticket).to be_valid
    end

    it "enforces uniqueness of notion_page_id when present" do
      create(:ticket, notion_page_id: "unique-page-id")
      duplicate = build(:ticket, notion_page_id: "unique-page-id")
      expect { duplicate.save! }.to raise_error(ActiveRecord::RecordNotUnique)
    end
  end
end
