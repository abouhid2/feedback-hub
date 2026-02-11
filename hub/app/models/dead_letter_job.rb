class DeadLetterJob < ApplicationRecord
  validates :job_class, presence: true
  validates :error_class, presence: true
  validates :error_message, presence: true
  validates :failed_at, presence: true
  validates :status, inclusion: { in: %w[unresolved resolved retried] }

  scope :unresolved, -> { where(status: "unresolved") }
  scope :recent, -> { order(failed_at: :desc) }
end
