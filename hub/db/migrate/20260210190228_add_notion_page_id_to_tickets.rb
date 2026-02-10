class AddNotionPageIdToTickets < ActiveRecord::Migration[8.1]
  def change
    add_column :tickets, :notion_page_id, :string
    add_index :tickets, :notion_page_id, unique: true, where: "notion_page_id IS NOT NULL"
  end
end
