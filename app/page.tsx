export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold">AUD/THB Forecast Dashboard</h1>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <div className="bg-slate-900 rounded-xl p-6">
            <p className="text-slate-400">Current Rate</p>
            <p className="text-4xl font-bold mt-2">23.7300</p>

            <div className="mt-4">
              <p>1H: <span className="text-green-400">+0.12%</span></p>
              <p>4H: <span className="text-green-400">+0.28%</span></p>
            </div>
          </div>

          <div className="bg-slate-900 rounded-xl p-6">
            <p className="text-slate-400">Forecast</p>

            <p className="mt-4">Next 1H</p>
            <p className="text-xl font-semibold">23.70 – 23.77</p>

            <p className="mt-4">Next 4H</p>
            <p className="text-xl font-semibold">23.67 – 23.80</p>
          </div>

          <div className="bg-slate-900 rounded-xl p-6">
            <p className="text-slate-400">FX Score</p>
            <p className="text-5xl font-bold text-green-400 mt-2">+18</p>

            <p className="mt-4 text-green-400">Bullish</p>
            <p className="text-slate-400">Confidence: Medium-Low</p>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 mt-4">
          <h2 className="text-xl font-semibold">Score Breakdown</h2>

          <div className="mt-4 space-y-2">
            <p>Price / Momentum: <span className="text-green-400">+45</span></p>
            <p>Cross Currency: <span className="text-green-400">+20</span></p>
            <p>Relative Market: <span className="text-red-400">-10</span></p>
            <p>Macro / Policy: 0</p>
            <p>Commodity: <span className="text-green-400">+30</span></p>
            <p>Risk: <span className="text-red-400">-45</span></p>
            <p>Mean Reversion: <span className="text-red-400">-20</span></p>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 mt-4">
          <h2 className="text-xl font-semibold">Sources</h2>

          <div className="mt-4 space-y-2 text-slate-300">
            <p>AUD/THB — Market API</p>
            <p>AUD/USD — Market API</p>
            <p>USD/THB — Market API</p>
            <p>Australia CPI — ABS</p>
            <p>RBA Policy — RBA</p>
            <p>Thailand Policy — BOT</p>
          </div>
        </div>
      </div>
    </main>
  );
}