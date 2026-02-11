class ForceFailStore
  TTL = 600 # 10 minutes

  def self.arm(key)
    redis { |conn| conn.set(key, "1", ex: TTL) }
  end

  def self.disarm(key)
    redis { |conn| conn.del(key) }
  end

  def self.exist?(key)
    redis { |conn| conn.exists(key) > 0 }
  end

  def self.delete(key)
    disarm(key)
  end

  def self.armed?(key)
    exist?(key)
  end

  def self.redis(&block)
    Sidekiq.redis(&block)
  end
end
