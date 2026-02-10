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

  describe "defaults" do
    it "defaults status to pending and retry_count to 0" do
      notification = create(:notification)
      expect(notification.status).to eq("pending")
      expect(notification.retry_count).to eq(0)
    end
  end
end
