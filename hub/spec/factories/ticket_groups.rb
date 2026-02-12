FactoryBot.define do
  factory :ticket_group do
    name { "Related tickets: #{Faker::Lorem.words(number: 3).join(' ')}" }
    status { "open" }

    trait :resolved do
      status { "resolved" }
      resolved_at { Time.current }
      resolved_via_channel { "slack" }
      resolution_note { "Resolved as duplicate" }
    end

    trait :with_tickets do
      transient do
        ticket_count { 2 }
      end

      after(:create) do |group, evaluator|
        tickets = create_list(:ticket, evaluator.ticket_count)
        tickets.each { |t| t.update!(ticket_group: group) }
        group.update!(primary_ticket: tickets.first)
      end
    end
  end
end
