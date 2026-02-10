class AddLastMessageAtToReporterIdentities < ActiveRecord::Migration[8.1]
  def change
    add_column :reporter_identities, :last_message_at, :datetime
  end
end
