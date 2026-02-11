require "rails_helper"

RSpec.describe StructuredLogger do
  let(:output) { StringIO.new }
  let(:logger) { described_class.new(output) }

  describe "#info" do
    it "outputs valid JSON" do
      logger.info("Test message")
      line = JSON.parse(output.string.strip)
      expect(line).to be_a(Hash)
    end

    it "includes level, message, and timestamp" do
      logger.info("Hello world")
      line = JSON.parse(output.string.strip)
      expect(line["level"]).to eq("info")
      expect(line["message"]).to eq("Hello world")
      expect(line["timestamp"]).to be_present
    end

    it "includes ISO 8601 timestamp" do
      freeze_time do
        logger.info("test")
        line = JSON.parse(output.string.strip)
        expect(Time.iso8601(line["timestamp"])).to eq(Time.current)
      end
    end
  end

  describe "#warn" do
    it "logs with warn level" do
      logger.warn("Watch out")
      line = JSON.parse(output.string.strip)
      expect(line["level"]).to eq("warn")
      expect(line["message"]).to eq("Watch out")
    end
  end

  describe "#error" do
    it "logs with error level" do
      logger.error("Something broke")
      line = JSON.parse(output.string.strip)
      expect(line["level"]).to eq("error")
      expect(line["message"]).to eq("Something broke")
    end
  end

  describe "#debug" do
    it "logs with debug level" do
      logger.debug("Debug info")
      line = JSON.parse(output.string.strip)
      expect(line["level"]).to eq("debug")
    end
  end

  describe "context fields" do
    it "includes extra context in the log line" do
      logger.info("Ticket ingested", ticket_id: "abc-123", channel: "slack")
      line = JSON.parse(output.string.strip)
      expect(line["ticket_id"]).to eq("abc-123")
      expect(line["channel"]).to eq("slack")
    end

    it "includes job_name context" do
      logger.info("Job started", job_name: "ChangelogGeneratorJob")
      line = JSON.parse(output.string.strip)
      expect(line["job_name"]).to eq("ChangelogGeneratorJob")
    end

    it "includes duration_ms context" do
      logger.info("Job completed", job_name: "NotionSyncJob", duration_ms: 142)
      line = JSON.parse(output.string.strip)
      expect(line["duration_ms"]).to eq(142)
    end
  end

  describe "#with_context" do
    it "returns a tagged logger that merges default context" do
      tagged = logger.with_context(service: "ingestion", channel: "slack")
      tagged.info("Ingesting ticket", ticket_id: "xyz")

      line = JSON.parse(output.string.strip)
      expect(line["service"]).to eq("ingestion")
      expect(line["channel"]).to eq("slack")
      expect(line["ticket_id"]).to eq("xyz")
    end

    it "does not affect the parent logger" do
      logger.with_context(service: "ingestion")
      logger.info("No context")

      line = JSON.parse(output.string.strip)
      expect(line).not_to have_key("service")
    end
  end

  describe "#measure" do
    it "logs with duration_ms" do
      logger.measure("Slow operation", level: :info) { sleep(0.01) }
      line = JSON.parse(output.string.strip)
      expect(line["message"]).to eq("Slow operation")
      expect(line["duration_ms"]).to be >= 10
    end

    it "returns the block result" do
      result = logger.measure("Computation") { 42 }
      expect(result).to eq(42)
    end

    it "logs error level on exception and re-raises" do
      expect {
        logger.measure("Failing operation") { raise "boom" }
      }.to raise_error("boom")

      line = JSON.parse(output.string.strip)
      expect(line["level"]).to eq("error")
      expect(line["error"]).to eq("boom")
    end
  end

  describe "error serialization" do
    it "serializes exception context" do
      begin
        raise StandardError, "test error"
      rescue => e
        logger.error("Failed", error: e.message, error_class: e.class.name)
      end

      line = JSON.parse(output.string.strip)
      expect(line["error"]).to eq("test error")
      expect(line["error_class"]).to eq("StandardError")
    end
  end

  describe ".instance" do
    it "returns a singleton logger" do
      expect(described_class.instance).to be_a(described_class)
      expect(described_class.instance).to equal(described_class.instance)
    end
  end
end
