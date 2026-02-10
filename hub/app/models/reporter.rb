class Reporter < ApplicationRecord
  has_many :reporter_identities, dependent: :destroy
  has_many :tickets, dependent: :nullify

  validates :name, presence: true
end
