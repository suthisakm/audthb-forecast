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

    let crossCurrencyScore: number | null = null;
  let crossCurrencyChange1H: number | null = null;

  async function getLatestSymbolPrice(symbol: string) {
    const { data } = await supabaseAdmin
      .from("market_prices")
      .select("rate, market_timestamp")
      .eq("symbol", symbol)
      .order("market_timestamp", { ascending: false })
      .limit(1)
      .maybeSingle();

    return data;
  }

  async function getSymbolPriceNearTime(
    symbol: string,
    targetTime: number
  ) {
    const tolerance = 20 * 60 * 1000;

    const { data } = await supabaseAdmin
      .from("market_prices")
      .select("rate, market_timestamp")
      .eq("symbol", symbol)
      .gte(
        "market_timestamp",
        new Date(targetTime - tolerance).toISOString()
      )
      .lte(
        "market_timestamp",
        new Date(targetTime + tolerance).toISOString()
      );

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

  const [audUsdNow, usdThbNow] = await Promise.all([
    getLatestSymbolPrice("AUD/USD"),
    getLatestSymbolPrice("USD/THB"),
  ]);

  if (audUsdNow && usdThbNow) {
    const referenceTime = Math.min(
      new Date(audUsdNow.market_timestamp).getTime(),
      new Date(usdThbNow.market_timestamp).getTime()
    );

    const oneHourAgo = referenceTime - 60 * 60 * 1000;

    const [audUsd1H, usdThb1H] = await Promise.all([
      getSymbolPriceNearTime("AUD/USD", oneHourAgo),
      getSymbolPriceNearTime("USD/THB", oneHourAgo),
    ]);

    if (audUsd1H && usdThb1H) {
      const currentCross =
        Number(audUsdNow.rate) * Number(usdThbNow.rate);

      const pastCross =
        Number(audUsd1H.rate) * Number(usdThb1H.rate);

      crossCurrencyChange1H =
        ((currentCross - pastCross) / pastCross) * 100;

      if (crossCurrencyChange1H >= 0.3) {
        crossCurrencyScore = 100;
      } else if (crossCurrencyChange1H >= 0.2) {
        crossCurrencyScore = 75;
      } else if (crossCurrencyChange1H >= 0.1) {
        crossCurrencyScore = 50;
      } else if (crossCurrencyChange1H >= 0.05) {
        crossCurrencyScore = 25;
      } else if (crossCurrencyChange1H <= -0.3) {
        crossCurrencyScore = -100;
      } else if (crossCurrencyChange1H <= -0.2) {
        crossCurrencyScore = -75;
      } else if (crossCurrencyChange1H <= -0.1) {
        crossCurrencyScore = -50;
      } else if (crossCurrencyChange1H <= -0.05) {
        crossCurrencyScore = -25;
      } else {
        crossCurrencyScore = 0;
      }
    }
  }

    function get1HScore(change: number) {
    if (change >= 0.30) return 100;
    if (change >= 0.20) return 75;
    if (change >= 0.10) return 50;
    if (change >= 0.05) return 25;

    if (change <= -0.30) return -100;
    if (change <= -0.20) return -75;
    if (change <= -0.10) return -50;
    if (change <= -0.05) return -25;

    return 0;
  }

  function get4HScore(change: number) {
    if (change >= 0.70) return 100;
    if (change >= 0.40) return 75;
    if (change >= 0.20) return 50;
    if (change >= 0.10) return 25;

    if (change <= -0.70) return -100;
    if (change <= -0.40) return -75;
    if (change <= -0.20) return -50;
    if (change <= -0.10) return -25;

    return 0;
  }

  const priceScore1H =
    change1H !== null ? get1HScore(change1H) : null;

  const priceScore4H =
    change4H !== null ? get4HScore(change4H) : null;

  let priceMomentumScore: number | null = null;

  if (priceScore1H !== null && priceScore4H !== null) {
    priceMomentumScore = Math.round(
      priceScore1H * 0.6 + priceScore4H * 0.4
    );
  } else if (priceScore1H !== null) {
    priceMomentumScore = priceScore1H;
  } else if (priceScore4H !== null) {
    priceMomentumScore = priceScore4H;
  }

    let rangePosition: number | null = null;
  let meanReversionScore: number | null = null;

  if (
    latestPrice &&
    intradayLow !== null &&
    intradayHigh !== null &&
    intradayHigh > intradayLow
  ) {
    const currentRate = Number(latestPrice.rate);

    rangePosition =
      ((currentRate - intradayLow) /
        (intradayHigh - intradayLow)) *
      100;

    // อยู่ใกล้ High → Mean Reversion เป็นลบ
    // อยู่ใกล้ Low → Mean Reversion เป็นบวก
    meanReversionScore = Math.round(
      -(rangePosition - 50) * 2
    );

    // ป้องกันเกินช่วง -100 ถึง +100
    meanReversionScore = Math.max(
      -100,
      Math.min(100, meanReversionScore)
    );
  }

    const coreFactors = [
    {
      score: priceMomentumScore,
      weight: 35,
    },
    {
      score: crossCurrencyScore,
      weight: 20,
    },
    {
      score: meanReversionScore,
      weight: 5,
    },
  ];

  const availableCoreFactors = coreFactors.filter(
    (factor) => factor.score !== null
  );

  const availableCoreWeight = availableCoreFactors.reduce(
    (sum, factor) => sum + factor.weight,
    0
  );

  let coreFxScore: number | null = null;

  if (availableCoreWeight > 0) {
    const weightedTotal = availableCoreFactors.reduce(
      (sum, factor) =>
        sum + Number(factor.score) * factor.weight,
      0
    );

    coreFxScore = Math.round(
      weightedTotal / availableCoreWeight
    );
  }

  let coreBias = "Waiting for data";

  if (coreFxScore !== null) {
    if (coreFxScore >= 40) {
      coreBias = "Strong Bullish";
    } else if (coreFxScore >= 15) {
      coreBias = "Bullish";
    } else if (coreFxScore <= -40) {
      coreBias = "Strong Bearish";
    } else if (coreFxScore <= -15) {
      coreBias = "Bearish";
    } else {
      coreBias = "Neutral";
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
            <p className="text-slate-400">Core FX Score</p>
            <p className="text-5xl font-bold mt-2">
  {coreFxScore !== null
    ? `${coreFxScore > 0 ? "+" : ""}${coreFxScore}`
    : "--"}
</p>

<p className="mt-4">
  {coreBias}
</p>

<p className="text-slate-400">
  Core Coverage: {availableCoreWeight}/60
</p>

<p className="text-xs text-slate-500 mt-1">
  Price + Cross Currency + Mean Reversion
</p>
          </div>
        </div>

        <div className="bg-slate-900 rounded-xl p-6 mt-4">
          <h2 className="text-xl font-semibold">Score Breakdown</h2>

          <div className="mt-4 space-y-2">
            <p>
  Price / Momentum:{" "}
  <span>
    {priceMomentumScore !== null
      ? `${priceMomentumScore > 0 ? "+" : ""}${priceMomentumScore}`
      : "--"}
  </span>
</p>

<p className="text-sm text-slate-500">
  1H Score:{" "}
  {priceScore1H !== null
    ? `${priceScore1H > 0 ? "+" : ""}${priceScore1H}`
    : "--"}
  {" | "}
  4H Score:{" "}
  {priceScore4H !== null
    ? `${priceScore4H > 0 ? "+" : ""}${priceScore4H}`
    : "--"}
</p>
            <p>Cross Currency:{" "}
                <span>
                  {crossCurrencyScore !== null
                    ? `${crossCurrencyScore > 0 ? "+" : ""}${crossCurrencyScore}`
                    : "--"}
                </span>
            </p>
            <p className="text-sm text-slate-500">
                1H Cross Change:{" "}
                {crossCurrencyChange1H !== null
                ? `${crossCurrencyChange1H >= 0 ? "+" : ""}${crossCurrencyChange1H.toFixed(3)}%`
                : "--"}
            </p>
            <p>Relative Market: <span className="text-red-400">-10</span></p>
            <p>Macro / Policy: 0</p>
            <p>Commodity: <span className="text-green-400">+30</span></p>
            <p>Risk: <span className="text-red-400">-45</span></p>
            <p>
  Mean Reversion:{" "}
  <span>
    {meanReversionScore !== null
      ? `${meanReversionScore > 0 ? "+" : ""}${meanReversionScore}`
      : "--"}
  </span>
</p>

<p className="text-sm text-slate-500">
  Range Position:{" "}
  {rangePosition !== null
    ? `${rangePosition.toFixed(1)}%`
    : "--"}
</p>
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