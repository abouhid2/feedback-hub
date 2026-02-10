class ChangelogEntry < ApplicationRecord
  belongs_to :ticket
  has_many :notifications, dependent: :nullify

  STATUSES = %w[draft approved rejected].freeze

  validates :content, presence: true
  validates :status, presence: true, inclusion: { in: STATUSES }

  scope :drafts, -> { where(status: "draft") }
  scope :approved, -> { where(status: "approved") }
end
