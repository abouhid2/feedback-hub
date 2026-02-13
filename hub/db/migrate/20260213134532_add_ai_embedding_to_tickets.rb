class AddAiEmbeddingToTickets < ActiveRecord::Migration[8.1]
  def change
    add_column :tickets, :ai_embedding, :float, array: true
  end
end
