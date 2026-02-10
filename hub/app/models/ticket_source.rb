class TicketSource < ApplicationRecord
  belongs_to :ticket

  validates :platform, presence: true, inclusion: { in: %w[slack intercom whatsapp] }
  validates :external_id, presence: true, uniqueness: { scope: :platform }
end
