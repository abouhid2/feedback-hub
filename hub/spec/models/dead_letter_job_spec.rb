require "rails_helper"

RSpec.describe DeadLetterJob, type: :model do
  describe "validations" do
    it { should validate_presence_of(:job_class) }
    it { should validate_presence_of(:error_class) }
    it { should validate_presence_of(:error_message) }
    it { should validate_presence_of(:failed_at) }
    it { should validate_inclusion_of(:status).in_array(%w[unresolved resolved retried]) }
  end

  describe "scopes" do
    let!(:unresolved) { DeadLetterJob.create!(job_class: "FooJob", error_class: "StandardError", error_message: "fail", failed_at: Time.current, status: "unresolved") }
    let!(:resolved) { DeadLetterJob.create!(job_class: "BarJob", error_class: "StandardError", error_message: "fail", failed_at: 1.day.ago, status: "resolved") }
    let!(:retried) { DeadLetterJob.create!(job_class: "BazJob", error_class: "StandardError", error_message: "fail", failed_at: 2.days.ago, status: "retried") }

    it ".unresolved returns only unresolved records" do
      expect(DeadLetterJob.unresolved).to contain_exactly(unresolved)
    end

    it ".recent orders by failed_at desc" do
      expect(DeadLetterJob.recent.first).to eq(unresolved)
    end
  end
end
