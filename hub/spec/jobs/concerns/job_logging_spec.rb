require "rails_helper"

RSpec.describe JobLogging do
  let(:output) { StringIO.new }

  before do
    allow(StructuredLogger).to receive(:instance).and_return(StructuredLogger.new(output))
  end

  it "logs job started and completed around perform" do
    ticket = create(:ticket, status: "resolved")
    stub_request(:post, ChangelogGeneratorService::OPENAI_URL)
      .to_return(
        status: 200,
        body: {
          choices: [{ message: { content: "Fixed the bug" } }],
          usage: { prompt_tokens: 10, completion_tokens: 20 }
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )

    ChangelogGeneratorJob.perform_now(ticket.id)

    lines = output.string.strip.split("\n").map { |l| JSON.parse(l) }
    expect(lines.length).to eq(2)

    started = lines.first
    expect(started["message"]).to eq("Job started")
    expect(started["job_name"]).to eq("ChangelogGeneratorJob")
    expect(started["queue"]).to eq("default")

    completed = lines.last
    expect(completed["message"]).to eq("Job completed")
    expect(completed["duration_ms"]).to be >= 0
  end

  it "creates a dead letter job and does not re-raise when force-fail flag is armed" do
    ticket = create(:ticket, status: "resolved")
    ForceFailStore.arm("force_fail:ChangelogGeneratorJob")

    expect {
      ChangelogGeneratorJob.perform_now(ticket.id)
    }.to change(DeadLetterJob, :count).by(1)

    dlj = DeadLetterJob.last
    expect(dlj.job_class).to eq("ChangelogGeneratorJob")
    expect(dlj.error_class).to eq("JobLogging::ForceFailError")
    expect(dlj.error_message).to include("[Force Fail]")
    expect(dlj.status).to eq("unresolved")

    lines = output.string.strip.split("\n").map { |l| JSON.parse(l) }
    failed = lines.find { |l| l["message"] == "Job failed" }
    expect(failed["error"]).to include("[Force Fail]")

    # Flag is consumed (one-shot)
    expect(ForceFailStore.armed?("force_fail:ChangelogGeneratorJob")).to be false
  end

  it "logs job failure when an exception occurs" do
    stub_request(:post, ChangelogGeneratorService::OPENAI_URL)
      .to_return(status: 500, body: "Internal Server Error")

    ticket = create(:ticket, status: "resolved")

    begin
      ChangelogGeneratorJob.perform_now(ticket.id)
    rescue ChangelogGeneratorService::AiApiError
      # expected
    end

    lines = output.string.strip.split("\n").map { |l| JSON.parse(l) }
    failed = lines.find { |l| l["message"] == "Job failed" }
    expect(failed).to be_present
    expect(failed["error_class"]).to eq("ChangelogGeneratorService::AiApiError")
    expect(failed["level"]).to eq("error")
  end
end
