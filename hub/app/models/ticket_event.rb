class TicketEvent < ApplicationRecord
  belongs_to :ticket

  EVENT_TYPES = %w[
    created status_changed priority_changed commented assigned merged
    changelog_drafted changelog_approved changelog_rejected
    notification_sent notification_failed
    synced_to_notion
  ].freeze

  validates :event_type, presence: true, inclusion: { in: EVENT_TYPES }
end
