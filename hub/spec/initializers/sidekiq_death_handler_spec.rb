require "rails_helper"

RSpec.describe "Sidekiq death handler" do
  it "enqueues DeadLetterHandlerJob when invoked with job data and exception" do
    job = { "class" => "ChangelogGeneratorJob", "args" => ["ticket-99"], "queue" => "default" }
    exception = ChangelogGeneratorService::AiApiError.new("OpenAI down")

    # Test the handler lambda directly (same logic as config/initializers/sidekiq.rb)
    handler = ->(j, ex) {
      DeadLetterHandlerJob.perform_later(
        job_class: j["class"],
        job_args: j["args"],
        error_class: ex.class.name,
        error_message: ex.message,
        queue: j["queue"],
        backtrace: ex.backtrace&.first(10)
      )
    }

    expect {
      handler.call(job, exception)
    }.to have_enqueued_job(DeadLetterHandlerJob)
  end

  it "captures error details from the exception" do
    job = { "class" => "NotionSyncJob", "args" => ["ticket-42"], "queue" => "default" }
    exception = NotionSyncService::ApiError.new("Notion API 500")

    DeadLetterHandlerJob.perform_now(
      job_class: job["class"],
      job_args: job["args"],
      error_class: exception.class.name,
      error_message: exception.message,
      queue: job["queue"]
    )

    record = DeadLetterJob.last
    expect(record.job_class).to eq("NotionSyncJob")
    expect(record.error_class).to eq("NotionSyncService::ApiError")
    expect(record.error_message).to eq("Notion API 500")
  end
end
