FactoryBot.define do
  factory :ticket_source do
    ticket
    platform { "slack" }
    external_id { SecureRandom.hex(10) }
    external_url { "https://example.com/ticket/#{SecureRandom.hex(4)}" }
    raw_payload { {} }
  end
end
