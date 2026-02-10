class RedesignChangelogEntries < ActiveRecord::Migration[8.1]
  def change
    remove_column :changelog_entries, :field_name, :string
    remove_column :changelog_entries, :old_value, :string
    remove_column :changelog_entries, :new_value, :string
    remove_column :changelog_entries, :changed_by, :string

    add_column :changelog_entries, :content, :text, null: false
    add_column :changelog_entries, :status, :string, null: false, default: "draft"
    add_column :changelog_entries, :approved_by, :string
    add_column :changelog_entries, :approved_at, :datetime
    add_column :changelog_entries, :ai_model, :string
    add_column :changelog_entries, :ai_prompt_tokens, :integer
    add_column :changelog_entries, :ai_completion_tokens, :integer

    add_index :changelog_entries, :status
  end
end
