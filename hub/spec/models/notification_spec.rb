require "rails_helper"

RSpec.describe Notification, type: :model do
  describe "associations" do
    it { is_expected.to belong_to(:ticket) }
    it { is_expected.to belong_to(:changelog_entry).optional }
  end

  describe "validations" do
    it { is_expected.to validate_presence_of(:channel) }
    it { is_expected.to validate_presence_of(:recipient) }
    it { is_expected.to validate_presence_of(:status) }
    it { is_expected.to validate_inclusion_of(:channel).in_array(%w[email slack in_app intercom whatsapp]) }
    it { is_expected.to validate_inclusion_of(:status).in_array(%w[pending sent failed pending_batch_review]) }
    it { is_expected.to validate_numericality_of(:retry_count).is_greater_than_or_equal_to(0) }
  end

  describe "expanded channels" do
    %w[email slack in_app intercom whatsapp].each do |ch|
      it "accepts #{ch} as a valid channel" do
        notification = build(:notification, channel: ch)
        expect(notification).to be_valid
      end
    end

    it "rejects invalid channels" do
      notification = build(:notification, channel: "telegram")
      expect(notification).not_to be_valid
    end
  end

  describe "expanded statuses" do
    %w[pending sent failed pending_batch_review].each do |st|
      it "accepts #{st} as a valid status" do
        notification = build(:notification, status: st)
        expect(notification).to be_valid
      end
    end
  end

  describe "defaults" do
    it "defaults retry_count to 0" do
      notification = create(:notification)
      expect(notification.retry_count).to eq(0)
    end

    it "defaults status to pending" do
      notification = create(:notification)
      expect(notification.status).to eq("pending")
    end
  end

  describe "changelog_entry association" do
    it "can be linked to a changelog_entry" do
      entry = create(:changelog_entry)
      notification = create(:notification, changelog_entry: entry)
      expect(notification.changelog_entry).to eq(entry)
    end

    it "is optional" do
      notification = create(:notification, changelog_entry: nil)
      expect(notification).to be_valid
    end
  end

  describe "retry tracking" do
    it "tracks retry_count and last_error" do
      notification = create(:notification, :failed)
      expect(notification.retry_count).to eq(1)
      expect(notification.last_error).to eq("Connection timeout")
    end

    it "tracks delivered_at" do
      notification = create(:notification, :sent)
      expect(notification.delivered_at).to be_present
    end
  end
end
