class CreateDeadLetterJobs < ActiveRecord::Migration[8.1]
  def change
    create_table :dead_letter_jobs, id: :uuid do |t|
      t.string :job_class, null: false
      t.jsonb :job_args, default: []
      t.string :error_class, null: false
      t.text :error_message, null: false
      t.string :queue
      t.jsonb :backtrace
      t.datetime :failed_at, null: false
      t.string :status, default: "unresolved", null: false

      t.timestamps
    end

    add_index :dead_letter_jobs, :status
    add_index :dead_letter_jobs, :job_class
    add_index :dead_letter_jobs, :failed_at
  end
end
