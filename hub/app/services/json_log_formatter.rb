class JsonLogFormatter < ::Logger::Formatter
  def call(severity, timestamp, _progname, msg)
    {
      timestamp: timestamp.utc.iso8601(3),
      level: severity.downcase,
      message: msg.to_s.strip
    }.to_json + "\n"
  end
end
