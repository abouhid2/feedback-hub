require "rails_helper"

RSpec.describe ForceFailStore do
  let(:key) { "force_fail:TestJob" }

  before do
    # Clean up any leftover keys
    described_class.disarm(key)
  end

  describe ".arm / .armed?" do
    it "arms a key and reports it as armed" do
      expect(described_class.armed?(key)).to be false

      described_class.arm(key)
      expect(described_class.armed?(key)).to be true
    end
  end

  describe ".disarm" do
    it "disarms a previously armed key" do
      described_class.arm(key)
      expect(described_class.armed?(key)).to be true

      described_class.disarm(key)
      expect(described_class.armed?(key)).to be false
    end
  end

  describe ".delete" do
    it "is an alias for disarm" do
      described_class.arm(key)
      described_class.delete(key)
      expect(described_class.armed?(key)).to be false
    end
  end
end
