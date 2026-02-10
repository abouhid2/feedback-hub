class ReporterIdentity < ApplicationRecord
  belongs_to :reporter

  validates :platform, presence: true, inclusion: { in: %w[slack intercom whatsapp] }
  validates :platform_user_id, presence: true, uniqueness: { scope: :platform }
end
