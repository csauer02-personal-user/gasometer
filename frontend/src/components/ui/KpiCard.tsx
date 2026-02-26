interface KpiCardProps {
  label: string;
  value: string;
  loading?: boolean;
  subtitle?: string;
}

export function KpiCard({ label, value, loading, subtitle }: KpiCardProps) {
  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <p className="text-gray-400 text-sm">{label}</p>
      <p className="text-2xl font-bold text-amber-400">
        {loading ? (
          <span className="inline-block w-16 h-7 bg-gray-800 rounded animate-pulse" />
        ) : (
          value
        )}
      </p>
      {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
    </div>
  );
}
