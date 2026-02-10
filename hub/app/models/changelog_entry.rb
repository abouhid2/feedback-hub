class ChangelogEntry < ApplicationRecord
  belongs_to :ticket

  validates :field_name, presence: true
end
