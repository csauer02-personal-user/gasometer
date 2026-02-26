export default function DashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Cost Dashboard</h1>
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <p className="text-gray-400 text-sm">Today</p>
          <p className="text-2xl font-bold text-amber-400">$—</p>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <p className="text-gray-400 text-sm">This Week</p>
          <p className="text-2xl font-bold text-amber-400">$—</p>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <p className="text-gray-400 text-sm">This Month</p>
          <p className="text-2xl font-bold text-amber-400">$—</p>
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <p className="text-gray-400 text-sm">Sessions</p>
          <p className="text-2xl font-bold text-amber-400">—</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 h-64 flex items-center justify-center text-gray-500">
          Cost River (D3) — Bead 5
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 h-64 flex items-center justify-center text-gray-500">
          Burn Rate Gauge (D3) — Bead 5
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 h-64 flex items-center justify-center text-gray-500">
          Heat Calendar (D3) — Bead 5
        </div>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800 h-64 flex items-center justify-center text-gray-500">
          Role Treemap (D3) — Bead 5
        </div>
      </div>
    </div>
  );
}
