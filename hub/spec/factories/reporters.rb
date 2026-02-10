FactoryBot.define do
  factory :reporter do
    name { Faker::Name.name }
    email { Faker::Internet.unique.email }
    company { Faker::Company.name }
    role { %w[user admin agent].sample }
  end
end
