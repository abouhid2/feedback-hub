require "rails_helper"

RSpec.describe DeadLetterHandlerJob, type: :job do
  describe "#perform" do
    let(:job_class) { "ChangelogGeneratorJob" }
    let(:job_args) { ["abc-123"] }
    let(:error_class) { "ChangelogGeneratorService::AiApiError" }
    let(:error_message) { "OpenAI returned 500: Internal Server Error" }
    let(:queue) { "default" }

    it "creates a DeadLetterJob record" do
      expect {
        described_class.new.perform(
          job_class: job_class,
          job_args: job_args,
          error_class: error_class,
          error_message: error_message,
          queue: queue
        )
      }.to change(DeadLetterJob, :count).by(1)
    end

    it "stores all job metadata correctly" do
      described_class.new.perform(
        job_class: job_class,
        job_args: job_args,
        error_class: error_class,
        error_message: error_message,
        queue: queue
      )

      record = DeadLetterJob.last
      expect(record.job_class).to eq("ChangelogGeneratorJob")
      expect(record.job_args).to eq(["abc-123"])
      expect(record.error_class).to eq("ChangelogGeneratorService::AiApiError")
      expect(record.error_message).to eq("OpenAI returned 500: Internal Server Error")
      expect(record.queue).to eq("default")
      expect(record.failed_at).to be_present
    end

    it "stores optional backtrace" do
      described_class.new.perform(
        job_class: job_class,
        job_args: job_args,
        error_class: error_class,
        error_message: error_message,
        queue: queue,
        backtrace: ["app/services/changelog_generator_service.rb:81"]
      )

      record = DeadLetterJob.last
      expect(record.backtrace).to eq(["app/services/changelog_generator_service.rb:81"])
    end

    it "defaults status to unresolved" do
      described_class.new.perform(
        job_class: job_class,
        job_args: job_args,
        error_class: error_class,
        error_message: error_message,
        queue: queue
      )

      expect(DeadLetterJob.last.status).to eq("unresolved")
    end

    it "is enqueued on the default queue" do
      expect(described_class.new.queue_name).to eq("default")
    end
  end
end
