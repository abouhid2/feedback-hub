FactoryBot.define do
  factory :ticket do
    title { Faker::Lorem.sentence(word_count: 5) }
    description { Faker::Lorem.paragraph }
    ticket_type { "bug" }
    priority { 3 }
    status { "open" }
    original_channel { "slack" }
    tags { [] }
    metadata { {} }
    reporter

    trait :resolved do
      status { "resolved" }
    end

    trait :closed do
      status { "closed" }
    end

    trait :in_progress do
      status { "in_progress" }
    end

    trait :from_intercom do
      original_channel { "intercom" }
    end

    trait :from_whatsapp do
      original_channel { "whatsapp" }
    end
  end
end
