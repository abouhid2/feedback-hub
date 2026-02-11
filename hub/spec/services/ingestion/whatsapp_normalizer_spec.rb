require "rails_helper"

RSpec.describe Ingestion::WhatsappNormalizer, type: :service do
  let(:wa_payload) do
    {
      entry: [{
        changes: [{
          value: {
            metadata: { phone_number_id: "123456" },
            contacts: [{ wa_id: "+5511999990000", profile: { name: "Maria Silva" } }],
            messages: [{
              id: "wamid.#{SecureRandom.hex(8)}",
              from: "+5511999990000",
              type: "text",
              text: { body: "Mi app se crashea al abrir" }
            }]
          }
        }]
      }]
    }
  end

  describe "#normalize" do
    it "sets last_message_at on the reporter identity" do
      freeze_time do
        normalizer = described_class.new(wa_payload)
        normalizer.normalize

        identity = ReporterIdentity.find_by(platform: "whatsapp", platform_user_id: "+5511999990000")
        expect(identity.last_message_at).to eq(Time.current)
      end
    end
  end
end
