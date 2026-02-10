class Notification < ApplicationRecord
  belongs_to :ticket
  belongs_to :changelog_entry, optional: true

  CHANNELS = %w[email slack in_app intercom whatsapp].freeze
  STATUSES = %w[pending sent failed pending_batch_review].freeze

  validates :channel, presence: true, inclusion: { in: CHANNELS }
  validates :recipient, presence: true
  validates :status, presence: true, inclusion: { in: STATUSES }
  validates :retry_count, numericality: { greater_than_or_equal_to: 0 }
end
