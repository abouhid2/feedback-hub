class AddAiTriageFieldsToTickets < ActiveRecord::Migration[8.1]
  def change
    add_column :tickets, :ai_suggested_type, :string
    add_column :tickets, :ai_suggested_priority, :integer
    add_column :tickets, :ai_summary, :text
    add_column :tickets, :enrichment_status, :string, default: "pending"
    add_index :tickets, :enrichment_status
  end
end
