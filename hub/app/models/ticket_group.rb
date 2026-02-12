class TicketGroup < ApplicationRecord
  has_many :tickets, dependent: :nullify
  belongs_to :primary_ticket, class_name: "Ticket", optional: true

  STATUSES = %w[open resolved].freeze

  validates :name, presence: true
  validates :status, inclusion: { in: STATUSES }

  scope :open_groups, -> { where(status: "open") }
  scope :resolved_groups, -> { where(status: "resolved") }
  scope :recent, -> { order(created_at: :desc) }
end
