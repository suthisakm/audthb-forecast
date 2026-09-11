const scores = [
  { name: "Price / Momentum", score: 45, description: "1H และ 4H เป็นบวก" },
  { name: "Cross Currency", score: 20, description: "AUD/USD + USD/THB" },
  { name: "Relative Market", score: -10, description: "Yield / CNH / Asian FX" },
  { name: "Macro / Policy", score: 0, description: "RBA / BOT / Macro data" },
  { name: "Commodity", score: 30, description: "Oil / Iron Ore / Gold" },
  { name: "Risk", score: -45, description: "VIX / Equity sentiment" },
  { name: "Mean Reversion", score: -20, description: "ราคาอยู่ด้านบนของ daily range" },
];

const sources = [
  { name: "AUD/THB", source: "Market API", status: "Updated 09:59" },
  { name: "AUD/USD", source: "Market API", status: "Updated 09:59" },
  { name: "USD/THB", source: "Market API", status: "Updated 09:59" },
  { name: "Australia CPI", source: "ABS", status: "Latest: Jul 2026" },
  { name: "RBA Policy", source: "RBA", status: "Official source" },
  { name: "Thailand Policy", source: "BOT", status: "Official source" },
];

function ScoreValue({ value }: { value: number }) {
  const text =
    value > 0
      ? `+${value}`
      : value.toString();

  const color =
    value > 0
      ? "text-emerald-400"
      : value < 0
      ? "text-red-400"
      : "text-slate-400";

  return <span className={`font-semibold ${color}`}>{text}</span>;
}

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-sm font-medium text-sky-400">
              TREASURY FORECAST
            </p>

            <h1 className="text-3xl font-semibold tracking-tight">
              AUD/THB Dashboard
            </h1>

            <p className="mt-2 text-sm text-slate-400">
              Hourly FX forecast with score breakdown and source tracking
            </p>
          </div>

          <div className="text-left md:text-right">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-sm text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              LIVE
            </div>

            <p className="mt-2 text-xs text-slate-500">
              11 Sep 2026 · 10:00 Bangkok
            </p>
          </div>
        </div>

        {/* Top cards */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Current Rate */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Current AUD/THB</p>

            <div className="mt-3 flex items-end gap-3">
              <span className="font-mono text-4xl font-semibold">
                23.7300
              </span>

              <span className="mb-1 text-sm text-emerald-400">
                +0.12%
              </span>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-xs text-slate-500">1H</p>
                <p className="mt-1 font-medium text-emerald-400">
                  +0.12%
                </p>
              </div>

              <div className="rounded-xl bg-slate-950 p-3">
                <p className="text-xs text-slate-500">4H</p>
                <p className="mt-1 font-medium text-emerald-400">
                  +0.28%
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex justify-between text-xs text-slate-500">
                <span>23.67 Low</span>
                <span>23.75 High</span>
              </div>

              <div className="h-2 rounded-full bg-slate-800">
                <div className="h-2 w-[76%] rounded-full bg-sky-500" />
              </div>

              <p className="mt-2 text-xs text-slate-500">
                Current price at 76% of intraday range
              </p>
            </div>
          </section>

          {/* Forecast */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">Forecast Range</p>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Next 1H</span>
                <span className="font-mono font-medium">
                  23.70 – 23.77
                </span>
              </div>

              <div className="mt-3 h-2 rounded-full bg-slate-800">
                <div className="ml-[25%] h-2 w-[45%] rounded-full bg-sky-500" />
              </div>
            </div>

            <div className="mt-7">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Next 4H</span>
                <span className="font-mono font-medium">
                  23.67 – 23.80
                </span>
              </div>

              <div className="mt-3 h-2 rounded-full bg-slate-800">
                <div className="ml-[10%] h-2 w-[75%] rounded-full bg-indigo-500" />
              </div>
            </div>

            <div className="mt-7 rounded-xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-xs font-medium text-amber-400">
                EVENT RISK · VERY HIGH
              </p>

              <p className="mt-2 text-sm">
                US CPI · 19:30 Thailand
              </p>
            </div>
          </section>

          {/* FX Score */}
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-sm text-slate-400">FX Score</p>

            <div className="mt-3 text-5xl font-semibold text-emerald-400">
              +18
            </div>

            <div className="mt-4 inline-flex rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-medium text-emerald-400">
              Bullish
            </div>

            <div className="mt-7 space-y-4">
              <div className="flex justify-between">
                <span className="text-sm text-slate-400">
                  Confidence
                </span>
                <span className="text-sm">Medium-Low</span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-slate-400">
                  Action
                </span>
                <span className="text-sm text-emerald-400">
                  Postfund Bias
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-sm text-slate-400">
                  Model
                </span>
                <span className="text-sm">Hourly V1</span>
              </div>
            </div>
          </section>
        </div>

        {/* Score Breakdown + Sources */}
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6 lg:col-span-2">
            <div className="mb-6">
              <h2 className="text-lg font-semibold">Score Breakdown</h2>
              <p className="mt-1 text-sm text-slate-500">
                ปัจจัยที่ใช้คำนวณ FX Score รอบล่าสุด
              </p>
            </div>

            <div className="divide-y divide-slate-800">
              {scores.map((item) => (
                <div
                  key={item.name}
                  className="grid gap-2 py-4 md:grid-cols-[1fr_120px_1fr] md:items-center"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {item.description}
                    </p>
                  </div>

                  <div className="md:text-center">
                    <ScoreValue value={item.score} />
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                    {item.score >= 0 ? (
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${Math.min(Math.abs(item.score), 100)}%`,
                        }}
                      />
                    ) : (
                      <div
                        className="h-full rounded-full bg-red-500"
                        style={{
                          width: `${Math.min(Math.abs(item.score), 100)}%`,
                        }}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-lg font-semibold">Sources</h2>
            <p className="mt-1 text-sm text-slate-500">
              Sources used in this forecast
            </p>

            <div className="mt-6 space-y-3">
              {sources.map((source) => (
                <div
                  key={source.name}
                  className="rounded-xl border border-slate-800 bg-slate-950 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">
                      {source.name}
                    </span>

                    <span className="text-xs text-sky-400">
                      {source.source}
                    </span>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    {source.status}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Explanation */}
        <section className="mt-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="text-lg font-semibold">Why +18?</h2>

          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-400">
            Price momentum และ commodity pressure สนับสนุน AUD/THB
            ขึ้น ขณะที่ risk sentiment และ mean reversion
            เป็นแรงกดคะแนนลง อีกทั้งมี US CPI เวลา 19:30
            จึงลดระดับ Confidence ลงเป็น Medium-Low
          </p>
        </section>
      </div>
    </main>
  );
}