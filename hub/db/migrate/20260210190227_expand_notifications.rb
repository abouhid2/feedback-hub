class ExpandNotifications < ActiveRecord::Migration[8.1]
  def change
    add_column :notifications, :changelog_entry_id, :uuid
    add_column :notifications, :retry_count, :integer, default: 0
    add_column :notifications, :last_error, :text
    add_column :notifications, :delivered_at, :datetime

    add_foreign_key :notifications, :changelog_entries
    add_index :notifications, :changelog_entry_id
  end
end
