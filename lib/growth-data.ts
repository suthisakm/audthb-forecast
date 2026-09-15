import "server-only";

export type GrowthObservation = { country: string; period: string; value: number };
type CsvRow = Record<string, string>;
const COUNTRIES = ["AUS", "USA", "THA"];
const round = (value: number) => Number(value.toFixed(4));

// Supports quoted commas, escaped quotes and embedded newlines.
export function parseGrowthCsv(text: string): CsvRow[] {
  const records: string[][] = [];
  let record: string[] = [], field = "", quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i++; }
      else quoted = !quoted;
    } else if (c === "," && !quoted) {
      record.push(field.trim()); field = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      record.push(field.trim()); field = "";
      if (record.some(Boolean)) records.push(record);
      record = [];
    } else field += c;
  }
  if (quoted) throw new Error("Unclosed CSV quote");
  record.push(field.trim());
  if (record.some(Boolean)) records.push(record);
  const headers = records.shift() ?? [];
  for (const key of ["COUNTRY", "TIME_PERIOD", "OBS_VALUE", "INDICATOR", "PRICE_TYPE", "S_ADJUSTMENT", "TYPE_OF_TRANSFORMATION", "FREQUENCY"]) {
    if (!headers.includes(key)) throw new Error(`Missing IMF column: ${key}`);
  }
  return records.map((values) => {
    if (values.length !== headers.length) throw new Error("Invalid CSV column count");
    return Object.fromEntries(headers.map((key, i) => [key, values[i]]));
  });
}

export function growthObservations(rows: CsvRow[]): GrowthObservation[] {
  const unique = new Map<string, GrowthObservation>();
  for (const row of rows) {
    if (!COUNTRIES.includes(row.COUNTRY)) continue;
    if (row.INDICATOR !== "B1GQ" || row.PRICE_TYPE !== "Q" ||
        row.S_ADJUSTMENT !== "SA" || row.TYPE_OF_TRANSFORMATION !== "XDC" ||
        row.FREQUENCY !== "Q") throw new Error("Unexpected IMF GDP series definition");
    if (!/^\d{4}-Q[1-4]$/.test(row.TIME_PERIOD)) throw new Error("Invalid quarter");
    // Do not interpret missing values as zero. Keep a missing quarter visible.
    const value = row.OBS_VALUE.trim() === "" ? NaN : Number(row.OBS_VALUE);
    const item = { country: row.COUNTRY, period: row.TIME_PERIOD, value };
    const key = `${item.country}:${item.period}`;
    const previous = unique.get(key);
    if (previous && !Object.is(previous.value, value)) throw new Error(`Conflicting GDP values: ${key}`);
    unique.set(key, item);
  }
  return [...unique.values()];
}

const quarterIndex = (period: string) => Number(period.slice(0, 4)) * 4 + Number(period.slice(-1)) - 1;
export function calculateGrowthCountry(observations: GrowthObservation[], country: string) {
  const series = observations.filter((item) => item.country === country)
    .sort((a, b) => a.period.localeCompare(b.period));
  const latest = series.at(-1) ?? null;
  const previous = series.at(-2) ?? null;
  let reason: string | null = null;
  if (!latest || !previous) reason = "INSUFFICIENT_HISTORY";
  else if (quarterIndex(latest.period) - quarterIndex(previous.period) !== 1) reason = "NON_CONSECUTIVE_QUARTERS";
  else if (![latest.value, previous.value].every((v) => Number.isFinite(v) && v > 0)) reason = "INVALID_GDP_LEVEL";
  const available = reason === null;
  const qoqPercent = available && latest && previous ? round((latest.value / previous.value - 1) * 100) : null;
  return { country, available, latest, previous, qoqPercent, reason };
}

export function buildGrowthData(
  observations: GrowthObservation[]
) {
  const australia = calculateGrowthCountry(observations, "AUS");
  const unitedStates = calculateGrowthCountry(observations, "USA");
  const thailand = calculateGrowthCountry(observations, "THA");

  const countries = {
    australia,
    unitedStates,
    thailand,
  };

    const comparison = (
    left: typeof australia,
    right: typeof australia
  ) => {
    const now = new Date();

    const leftFreshness = getGrowthFreshness(
      left.latest?.period ?? null,
      now
    );

    const rightFreshness = getGrowthFreshness(
      right.latest?.period ?? null,
      now
    );

    const samePeriod =
      left.latest?.period === right.latest?.period;

    const dataAvailable =
      left.available && right.available && samePeriod;

    const available =
      dataAvailable &&
      leftFreshness.usable &&
      rightFreshness.usable;

    let reason: string | null = null;

    if (!left.available || !right.available) {
      reason = "COUNTRY_DATA_UNAVAILABLE";
    } else if (!samePeriod) {
      reason = "PERIOD_MISMATCH";
    } else if (!leftFreshness.usable) {
      reason = leftFreshness.reason;
    } else if (!rightFreshness.usable) {
      reason = rightFreshness.reason;
    }

    return {
      available,

      period: samePeriod
        ? left.latest?.period ?? null
        : null,

      differencePp: available
        ? round(left.qoqPercent! - right.qoqPercent!)
        : null,

      reason,

      freshness: {
        left: leftFreshness,
        right: rightFreshness,
      },
    };
  };

  const audUsd = comparison(australia, unitedStates);
  const usdThb = comparison(unitedStates, thailand);

  const audUsdScore = getGrowthSpreadScore(
    audUsd.differencePp
  );

  const usdThbScore = getGrowthSpreadScore(
    usdThb.differencePp
  );

  const legs = {
    audUsd: {
      ...audUsd,
      score: audUsdScore,
      plannedInternalWeight: 50,
      effectiveInternalWeight: audUsdScore !== null ? 50 : 0,
    },
    usdThb: {
      ...usdThb,
      score: usdThbScore,
      plannedInternalWeight: 50,
      effectiveInternalWeight: usdThbScore !== null ? 50 : 0,
    },
  };

  const coverage =
    legs.audUsd.effectiveInternalWeight +
    legs.usdThb.effectiveInternalWeight;

  const weightedSum =
    (audUsdScore ?? 0) * legs.audUsd.effectiveInternalWeight +
    (usdThbScore ?? 0) * legs.usdThb.effectiveInternalWeight;

  const score =
    coverage > 0
      ? Math.round(weightedSum / coverage)
      : null;

  return {
    status: coverage === 100
      ? "EXPERIMENTAL"
      : coverage > 0
        ? "PARTIAL"
        : "UNAVAILABLE",

    score,
    coverage,
    effectiveFxWeight: coverage / 100,
    maxFxWeight: 1,

    dataCoverage: round(
      Object.values(countries).filter(
        (country) => country.available
      ).length / 3 * 100
    ),

    countries,
    comparisons: { audUsd, usdThb },
    legs,

    methodology:
      "Experimental GDP-only Growth proxy. Real seasonally adjusted GDP QoQ, not annualized. AU-US and US-TH spread scores each have 50% weight. Missing legs reduce effective FX weight. Thresholds are not backtested. GDP data older than 180 days from quarter-end, or from a quarter that has not ended, is excluded from scoring. Other activity indicators are not yet implemented.",
  };
}

export async function getGrowthData() {
  const checkedAt = new Date().toISOString();
  try {
    const headers: Record<string, string> = { Accept: "text/csv" };
    const key = process.env.IMF_SDMX_SUBSCRIPTION_KEY;
    if (key) headers["Ocp-Apim-Subscription-Key"] = key;
    // Keep the exact endpoint that passed the supplied test.
    const response = await fetch(
      "https://api.imf.org/external/sdmx/3.0/data/dataflow/IMF.STA/QNEA/7.0.0/AUS+USA+THA.B1GQ.Q.SA.XDC.Q?startPeriod=2023-Q1",
      { headers, cache: "no-store", signal: AbortSignal.timeout(30000) },
    );
    if (!response.ok) throw new Error(`IMF HTTP ${response.status}`);
    const rows = parseGrowthCsv(await response.text());
    return { ...buildGrowthData(growthObservations(rows)), checkedAt, provider: "IMF QNEA", error: null };
  } catch (error) {
    // A Growth outage must not remove the other macro components.
    return {
      ...buildGrowthData([]), status: "UNAVAILABLE" as const, checkedAt, provider: "IMF QNEA",
      error: error instanceof Error ? error.message : "Growth fetch failed",
    };
  }
}

// Experimental GDP spread scoring — not yet backtested.
export function getGrowthSpreadScore(
  differencePp: number | null
): number | null {
  if (
    differencePp === null ||
    !Number.isFinite(differencePp)
  ) {
    return null;
  }

  const magnitude = Math.abs(differencePp);

  let score = 0;

  if (magnitude >= 1.0) {
    score = 100;
  } else if (magnitude >= 0.5) {
    score = 75;
  } else if (magnitude >= 0.25) {
    score = 50;
  } else if (magnitude >= 0.1) {
    score = 25;
  }

  if (score === 0) return 0;

  return differencePp > 0 ? score : -score;
}

export function getGrowthFreshness(
  period: string | null,
  now: Date = new Date()
) {
  const maxAgeDays = 180;
  const match = period?.match(/^(\d{4})-Q([1-4])$/);

  if (!match || !Number.isFinite(now.getTime())) {
    return {
      usable: false,
      ageDays: null,
      maxAgeDays,
      reason: "INVALID_PERIOD_OR_DATE",
    };
  }

  const year = Number(match[1]);
  const quarter = Number(match[2]);

  // Last day of the quarter, using UTC.
  const periodEnd = Date.UTC(year, quarter * 3, 0);

  const today = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate()
  );

  const ageDays = Math.floor(
    (today - periodEnd) / 86_400_000
  );

  return {
    usable: ageDays >= 0 && ageDays <= maxAgeDays,
    ageDays,
    maxAgeDays,
    reason:
      ageDays < 0
        ? "QUARTER_NOT_ENDED"
        : ageDays > maxAgeDays
          ? "STALE_DATA"
          : null,
  };
}
