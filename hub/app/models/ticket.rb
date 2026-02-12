class Ticket < ApplicationRecord
  belongs_to :reporter, optional: true
  belongs_to :ticket_group, optional: true
  has_many :ticket_sources, dependent: :destroy
  has_many :ticket_events, dependent: :destroy
  has_many :changelog_entries, dependent: :destroy
  has_many :notifications, dependent: :destroy
  has_many :attachments, dependent: :destroy

  validates :title, presence: true
  validates :ticket_type, presence: true, inclusion: { in: %w[bug feature_request question incident] }
  validates :priority, presence: true, inclusion: { in: 0..5 }
  validates :status, presence: true, inclusion: { in: %w[open in_progress resolved closed] }
  validates :original_channel, presence: true, inclusion: { in: %w[slack intercom whatsapp] }
  validates :enrichment_status, inclusion: { in: %w[pending completed failed] }, allow_nil: true

  scope :by_status, ->(status) { where(status: status) if status.present? }
  scope :by_channel, ->(channel) { where(original_channel: channel) if channel.present? }
  scope :by_priority, ->(priority) { where(priority: priority) if priority.present? }
  scope :by_type, ->(type) { where(ticket_type: type) if type.present? }
  scope :search, ->(query) { where("title ILIKE :q OR description ILIKE :q", q: "%#{sanitize_sql_like(query)}%") if query.present? }
  scope :recent, -> { order(created_at: :desc) }
end
