class Attachment < ApplicationRecord
  belongs_to :ticket

  validates :file_name, presence: true
end
