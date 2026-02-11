class StructuredLogger
  LEVELS = %w[debug info warn error].freeze

  def initialize(output = $stdout)
    @output = output
    @default_context = {}
  end

  LEVELS.each do |level|
    define_method(level) do |message, **context|
      write(level: level, message: message, **context)
    end
  end

  def with_context(**context)
    tagged = self.class.new(@output)
    tagged.instance_variable_set(:@default_context, @default_context.merge(context))
    tagged
  end

  def measure(message, level: :info, **context)
    start = Process.clock_gettime(Process::CLOCK_MONOTONIC)
    result = yield
    duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start) * 1000).round
    send(level, message, duration_ms: duration_ms, **context)
    result
  rescue => e
    duration_ms = ((Process.clock_gettime(Process::CLOCK_MONOTONIC) - start) * 1000).round
    error(message, duration_ms: duration_ms, error: e.message, error_class: e.class.name, **context)
    raise
  end

  def self.instance
    @instance ||= new
  end

  private

  def write(level:, message:, **context)
    entry = {
      timestamp: Time.current.iso8601(3),
      level: level,
      message: message
    }.merge(@default_context).merge(context)

    @output.puts(entry.to_json)
  end
end
