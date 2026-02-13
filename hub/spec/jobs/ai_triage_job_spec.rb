require "rails_helper"

RSpec.describe AiTriageJob, type: :job do
  let(:ticket) { create(:ticket) }

  before do
    allow(AiTriageService).to receive(:call)
    allow(AiEmbeddingService).to receive(:call)
    allow(AutoGroupingService).to receive(:call)
  end

  it "calls AiTriageService, AiEmbeddingService, then AutoGroupingService" do
    described_class.perform_now(ticket.id)

    expect(AiTriageService).to have_received(:call).with(ticket)
    expect(AiEmbeddingService).to have_received(:call).with(ticket)
    expect(AutoGroupingService).to have_received(:call).with(ticket)
  end

  it "discards gracefully if ticket not found" do
    expect { described_class.perform_now(SecureRandom.uuid) }.not_to raise_error
  end
end
