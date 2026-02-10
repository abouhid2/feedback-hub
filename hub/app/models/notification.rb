class Notification < ApplicationRecord
  belongs_to :ticket

  validates :channel, presence: true, inclusion: { in: %w[email slack in_app] }
  validates :recipient, presence: true
  validates :status, presence: true, inclusion: { in: %w[pending sent failed] }
end
