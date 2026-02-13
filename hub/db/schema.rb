# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_02_13_152510) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "pg_catalog.plpgsql"
  enable_extension "pgcrypto"

  create_table "attachments", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "file_name", null: false
    t.integer "file_size"
    t.string "file_type"
    t.string "source_platform"
    t.string "storage_url"
    t.uuid "ticket_id", null: false
    t.datetime "updated_at", null: false
    t.index ["ticket_id"], name: "index_attachments_on_ticket_id"
  end

  create_table "changelog_entries", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.integer "ai_completion_tokens"
    t.string "ai_model"
    t.integer "ai_prompt_tokens"
    t.datetime "approved_at"
    t.string "approved_by"
    t.text "content", null: false
    t.datetime "created_at", null: false
    t.string "status", default: "draft", null: false
    t.uuid "ticket_id", null: false
    t.datetime "updated_at", null: false
    t.index ["status"], name: "index_changelog_entries_on_status"
    t.index ["ticket_id"], name: "index_changelog_entries_on_ticket_id"
  end

  create_table "dead_letter_jobs", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.jsonb "backtrace"
    t.datetime "created_at", null: false
    t.string "error_class", null: false
    t.text "error_message", null: false
    t.datetime "failed_at", null: false
    t.jsonb "job_args", default: []
    t.string "job_class", null: false
    t.string "queue"
    t.string "status", default: "unresolved", null: false
    t.datetime "updated_at", null: false
    t.index ["failed_at"], name: "index_dead_letter_jobs_on_failed_at"
    t.index ["job_class"], name: "index_dead_letter_jobs_on_job_class"
    t.index ["status"], name: "index_dead_letter_jobs_on_status"
  end

  create_table "notifications", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "changelog_entry_id"
    t.string "channel", null: false
    t.text "content"
    t.datetime "created_at", null: false
    t.datetime "delivered_at"
    t.text "last_error"
    t.string "recipient", null: false
    t.integer "retry_count", default: 0
    t.datetime "sent_at"
    t.string "status", default: "pending", null: false
    t.uuid "ticket_id", null: false
    t.datetime "updated_at", null: false
    t.index ["changelog_entry_id"], name: "index_notifications_on_changelog_entry_id"
    t.index ["status"], name: "index_notifications_on_status"
    t.index ["ticket_id"], name: "index_notifications_on_ticket_id"
  end

  create_table "reporter_identities", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "display_name"
    t.datetime "last_message_at"
    t.jsonb "metadata", default: {}
    t.string "platform", null: false
    t.string "platform_user_id", null: false
    t.uuid "reporter_id", null: false
    t.datetime "updated_at", null: false
    t.index ["platform", "platform_user_id"], name: "index_reporter_identities_on_platform_and_platform_user_id", unique: true
    t.index ["reporter_id"], name: "index_reporter_identities_on_reporter_id"
  end

  create_table "reporters", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "company"
    t.datetime "created_at", null: false
    t.string "email"
    t.jsonb "metadata", default: {}
    t.string "name", null: false
    t.string "role"
    t.datetime "updated_at", null: false
    t.index ["email"], name: "index_reporters_on_email", unique: true, where: "(email IS NOT NULL)"
  end

  create_table "ticket_events", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "actor_id"
    t.string "actor_type"
    t.datetime "created_at", null: false
    t.jsonb "data", default: {}
    t.string "event_type", null: false
    t.uuid "ticket_id", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_ticket_events_on_created_at"
    t.index ["event_type"], name: "index_ticket_events_on_event_type"
    t.index ["ticket_id"], name: "index_ticket_events_on_ticket_id"
  end

  create_table "ticket_groups", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "name", null: false
    t.uuid "primary_ticket_id"
    t.text "resolution_note"
    t.datetime "resolved_at"
    t.string "resolved_via_channel"
    t.string "status", default: "open", null: false
    t.datetime "updated_at", null: false
    t.index ["status"], name: "index_ticket_groups_on_status"
  end

  create_table "ticket_sources", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "external_id", null: false
    t.string "external_url"
    t.string "platform", null: false
    t.jsonb "raw_payload", default: {}
    t.uuid "ticket_id", null: false
    t.datetime "updated_at", null: false
    t.index ["platform", "external_id"], name: "index_ticket_sources_on_platform_and_external_id", unique: true
    t.index ["ticket_id"], name: "index_ticket_sources_on_ticket_id"
  end

  create_table "tickets", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.float "ai_embedding", array: true
    t.integer "ai_suggested_priority"
    t.string "ai_suggested_type"
    t.text "ai_summary"
    t.datetime "created_at", null: false
    t.text "description"
    t.string "enrichment_status", default: "pending"
    t.jsonb "metadata", default: {}
    t.string "notion_page_id"
    t.string "original_channel", null: false
    t.string "pii_redacted_types", default: [], array: true
    t.integer "priority", default: 3, null: false
    t.uuid "reporter_id"
    t.string "status", default: "open", null: false
    t.jsonb "tags", default: []
    t.uuid "ticket_group_id"
    t.string "ticket_type", default: "bug", null: false
    t.string "title", null: false
    t.datetime "updated_at", null: false
    t.index ["created_at"], name: "index_tickets_on_created_at"
    t.index ["enrichment_status"], name: "index_tickets_on_enrichment_status"
    t.index ["notion_page_id"], name: "index_tickets_on_notion_page_id", unique: true, where: "(notion_page_id IS NOT NULL)"
    t.index ["original_channel"], name: "index_tickets_on_original_channel"
    t.index ["priority"], name: "index_tickets_on_priority"
    t.index ["reporter_id"], name: "index_tickets_on_reporter_id"
    t.index ["status"], name: "index_tickets_on_status"
    t.index ["ticket_group_id"], name: "index_tickets_on_ticket_group_id"
    t.index ["ticket_type"], name: "index_tickets_on_ticket_type"
  end

  add_foreign_key "attachments", "tickets"
  add_foreign_key "changelog_entries", "tickets"
  add_foreign_key "notifications", "changelog_entries"
  add_foreign_key "notifications", "tickets"
  add_foreign_key "reporter_identities", "reporters"
  add_foreign_key "ticket_events", "tickets"
  add_foreign_key "ticket_sources", "tickets"
  add_foreign_key "tickets", "reporters"
  add_foreign_key "tickets", "ticket_groups"
end
