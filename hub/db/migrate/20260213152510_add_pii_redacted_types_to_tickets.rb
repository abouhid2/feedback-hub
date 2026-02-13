class AddPiiRedactedTypesToTickets < ActiveRecord::Migration[8.1]
  def change
    add_column :tickets, :pii_redacted_types, :string, array: true, default: []
  end
end
