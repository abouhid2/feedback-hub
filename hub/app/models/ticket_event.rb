class TicketEvent < ApplicationRecord
  belongs_to :ticket

  validates :event_type, presence: true,
    inclusion: { in: %w[created status_changed priority_changed commented assigned merged] }
end
