class CreateFeedbackHubSchema < ActiveRecord::Migration[8.1]
  def change
    create_table :reporters, id: :uuid do |t|
      t.string :name, null: false
      t.string :email
      t.string :company
      t.string :role
      t.jsonb :metadata, default: {}
      t.timestamps
    end
    add_index :reporters, :email, unique: true, where: "email IS NOT NULL"

    create_table :reporter_identities, id: :uuid do |t|
      t.references :reporter, type: :uuid, null: false, foreign_key: true
      t.string :platform, null: false # slack, intercom, whatsapp
      t.string :platform_user_id, null: false
      t.string :display_name
      t.jsonb :metadata, default: {}
      t.timestamps
    end
    add_index :reporter_identities, [:platform, :platform_user_id], unique: true

    create_table :tickets, id: :uuid do |t|
      t.string :title, null: false
      t.text :description
      t.string :ticket_type, null: false, default: "bug" # bug, feature_request, question, incident
      t.integer :priority, null: false, default: 3 # 0=P0 critical, 5=P5 trivial
      t.string :status, null: false, default: "open" # open, in_progress, resolved, closed
      t.references :reporter, type: :uuid, foreign_key: true
      t.string :original_channel, null: false # slack, intercom, whatsapp
      t.jsonb :tags, default: []
      t.jsonb :metadata, default: {}
      t.timestamps
    end
    add_index :tickets, :status
    add_index :tickets, :priority
    add_index :tickets, :original_channel
    add_index :tickets, :ticket_type
    add_index :tickets, :created_at

    create_table :ticket_sources, id: :uuid do |t|
      t.references :ticket, type: :uuid, null: false, foreign_key: true
      t.string :platform, null: false # slack, intercom, whatsapp
      t.string :external_id, null: false
      t.string :external_url
      t.jsonb :raw_payload, default: {}
      t.timestamps
    end
    add_index :ticket_sources, [:platform, :external_id], unique: true

    create_table :ticket_events, id: :uuid do |t|
      t.references :ticket, type: :uuid, null: false, foreign_key: true
      t.string :event_type, null: false # created, status_changed, priority_changed, commented, assigned, merged
      t.string :actor_type # system, user, agent
      t.string :actor_id
      t.jsonb :data, default: {}
      t.timestamps
    end
    add_index :ticket_events, :event_type
    add_index :ticket_events, :created_at

    create_table :changelog_entries, id: :uuid do |t|
      t.references :ticket, type: :uuid, null: false, foreign_key: true
      t.string :field_name, null: false
      t.string :old_value
      t.string :new_value
      t.string :changed_by
      t.timestamps
    end

    create_table :notifications, id: :uuid do |t|
      t.references :ticket, type: :uuid, null: false, foreign_key: true
      t.string :channel, null: false # email, slack, in_app
      t.string :recipient, null: false
      t.string :status, null: false, default: "pending" # pending, sent, failed
      t.text :content
      t.datetime :sent_at
      t.timestamps
    end
    add_index :notifications, :status

    create_table :attachments, id: :uuid do |t|
      t.references :ticket, type: :uuid, null: false, foreign_key: true
      t.string :file_name, null: false
      t.string :file_type
      t.integer :file_size
      t.string :storage_url
      t.string :source_platform
      t.timestamps
    end
  end
end
