FactoryBot.define do
  factory :changelog_entry do
    ticket
    content { Faker::Lorem.paragraph }
    status { "draft" }
    ai_model { "gpt-4o-mini" }
    ai_prompt_tokens { 150 }
    ai_completion_tokens { 80 }

    trait :approved do
      status { "approved" }
      approved_by { "admin@example.com" }
      approved_at { Time.current }
    end

    trait :rejected do
      status { "rejected" }
    end
  end
end
