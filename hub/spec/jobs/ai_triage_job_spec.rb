require "rails_helper"

RSpec.describe AiTriageJob, type: :job do
  let(:ticket) { create(:ticket) }

  it "delegates to AiTriageService.call" do
    allow(AiTriageService).to receive(:call)
    described_class.perform_now(ticket.id)
    expect(AiTriageService).to have_received(:call).with(ticket)
  end

  it "discards gracefully if ticket not found" do
    expect { described_class.perform_now(SecureRandom.uuid) }.not_to raise_error
  end
end
