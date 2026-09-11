import { supabaseAdmin } from "@/lib/supabase-server";

export default async function Home() {
  const { data: latestPrice } = await supabaseAdmin
    .from("market_prices")
    .select("rate, market_timestamp, source")
    .eq("symbol", "AUD/THB")
    .order("market_timestamp", { ascending: false })
    .limit(1)
    .single();
        let change1H: number | null = null;
  let change4H: number | null = null;

  if (latestPrice) {
    const currentRate = Number(latestPrice.rate);
    const latestTime = new Date(latestPrice.market_timestamp).getTime();

    async function getClosestPrice(targetTime: number) {
      const tolerance = 20 * 60 * 1000; // ยอมให้คลาดเคลื่อน 20 นาที

      const startTime = new Date(targetTime - tolerance).toISOString();
      const endTime = new Date(targetTime + tolerance).toISOString();

      const { data } = await supabaseAdmin
        .from("market_prices")
        .select("rate, market_timestamp")
        .eq("symbol", "AUD/THB")
        .gte("market_timestamp", startTime)
        .lte("market_timestamp", endTime);

      if (!data || data.length === 0) {
        return null;
      }

      return data.reduce((closest, item) => {
        const itemDiff = Math.abs(
          new Date(item.market_timestamp).getTime() - targetTime
        );

        const closestDiff = Math.abs(
          new Date(closest.market_timestamp).getTime() - targetTime
        );

        return itemDiff < closestDiff ? item : closest;
      });
    }

    const [price1H, price4H] = await Promise.all([
      getClosestPrice(latestTime - 60 * 60 * 1000),
      getClosestPrice(latestTime - 4 * 60 * 60 * 1000),
    ]);

    if (price1H) {
      change1H =
        ((currentRate - Number(price1H.rate)) / Number(price1H.rate)) * 100;
    }

    if (price4H) {
      change4H =
        ((currentRate - Number(price4H.rate)) / Number(price4H.rate)) * 100;
    }
  }
    let intradayLow: number | null = null;
  let intradayHigh: number | null = null;

  if (latestPrice) {
    const latestTime = new Date(latestPrice.market_timestamp).getTime();

    // Bangkok = UTC+7
    const bangkokOffset = 7 * 60 * 60 * 1000;
    const bangkokTime = new Date(latestTime + bangkokOffset);

    const startOfDay =
      Date.UTC(
        bangkokTime.getUTCFullYear(),
        bangkokTime.getUTCMonth(),
        bangkokTime.getUTCDate(),
        0,
        0,
        0
      ) - bangkokOffset;

    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;

    const { data: todayPrices } = await supabaseAdmin
      .from("market_prices")
      .select("rate")
      .eq("symbol", "AUD/THB")
      .gte("market_timestamp", new Date(startOfDay).toISOString())
      .lt("market_timestamp", new Date(endOfDay).toISOString());

    if (todayPrices && todayPrices.length > 0) {
      const rates = todayPrices.map((item) => Number(item.rate));

      intradayLow = Math.min(...rates);
      intradayHigh = Math.max(...rates);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold">AUD/THB Forecast Dashboard</h1>

        <div className="grid md:grid-cols-3 gap-4 mt-8">
          <div className="bg-slate-900 rounded-xl p-6">
            <p className="text-slate-400">Current Rate</p>
            <p className="text-4xl font-bold mt-2">
                {latestPrice ? Number(latestPrice.rate).toFixed(4) : "--"}
            </p>
            {latestPrice && (
              <div className="mt-3 text-sm text-slate-400">
            <p>
               Last updated:{" "}
                {new Date(latestPrice.market_timestamp).toLocaleString("en-GB", {
                  timeZone: "Asia/Bangkok",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })}
            </p>
            

    <p>Source: {latestPrice.source}</p>
  </div>
  
)}


            <div className="mt-4">
              <p>
  1H:{" "}
  <span>
    {change1H !== null
      ? `${change1H >= 0 ? "+" : ""}${change1H.toFixed(2)}%`
      : "--"}
  </span>
</p>

<p>
  4H:{" "}
  <span>
    {change4H !== null
      ? `${change4H >= 0 ? "+" : ""}${change4H.toFixed(2)}%`
      : "--"}
  </span>
</p>

<p className="mt-2">
  Intraday:{" "}
  {intradayLow !== null && intradayHigh !== null
    ? `${intradayLow.toFixed(4)} – ${intradayHigh.toFixed(4)}`
    : "--"}
</p>
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