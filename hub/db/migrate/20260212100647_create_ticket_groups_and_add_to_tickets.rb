class CreateTicketGroupsAndAddToTickets < ActiveRecord::Migration[8.1]
  def change
    create_table :ticket_groups, id: :uuid do |t|
      t.string :name, null: false
      t.string :status, default: "open", null: false
      t.uuid :primary_ticket_id
      t.string :resolved_via_channel
      t.datetime :resolved_at
      t.text :resolution_note
      t.timestamps
    end
    add_index :ticket_groups, :status

    add_reference :tickets, :ticket_group, type: :uuid, foreign_key: true, index: true, null: true

    # Clean up lingering pending_batch_review notifications
    reversible do |dir|
      dir.up do
        execute <<-SQL
          UPDATE notifications
          SET status = 'failed', last_error = 'batch_review_removed'
          WHERE status = 'pending_batch_review'
        SQL
      end
    end
  end
end
