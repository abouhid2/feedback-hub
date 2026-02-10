FactoryBot.define do
  factory :ticket_event do
    ticket
    event_type { "created" }
    actor_type { "system" }
    actor_id { "system" }
    data { {} }
  end
end
