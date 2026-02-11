interface Stats {
  total: number;
  slack: number;
  intercom: number;
  whatsapp: number;
  critical: number;
}

export default function StatsCards({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
      <StatCard label="Total Tickets" value={stats.total} color="text-brand" />
      <StatCard label="Slack" value={stats.slack} color="text-purple-600" />
      <StatCard label="Intercom" value={stats.intercom} color="text-blue-600" />
      <StatCard label="WhatsApp" value={stats.whatsapp} color="text-green-600" />
      <StatCard label="Critical (P0-P1)" value={stats.critical} color="text-red-600" />
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="card hover:border-brand/30 transition-colors">
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
