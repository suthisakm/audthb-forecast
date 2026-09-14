import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

type Observation = {
  value: number;
  period: string;
};

async function getDbnomicsSeries(
  url: string
): Promise<Observation[]> {
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      `DBnomics request failed: ${response.status}`
    );
  }

  const json = await response.json();

  const doc = json?.series?.docs?.[0];

  const periods: string[] =
    doc?.period ?? [];

  const values: Array<number | null> =
    doc?.value ?? [];

  const observations: Observation[] = [];

  for (let i = 0; i < periods.length; i++) {
    const value = values[i];

    if (
      value !== null &&
      Number.isFinite(Number(value))
    ) {
      observations.push({
        value: Number(value),
        period: periods[i],
      });
    }
  }

  return observations.sort(
    (a, b) =>
      new Date(a.period).getTime() -
      new Date(b.period).getTime()
  );
}

function getLatest(
  series: Observation[]
): Observation | null {
  if (series.length === 0) {
    return null;
  }

  return series[series.length - 1];
}

function getClosestAtOrBefore(
  series: Observation[],
  targetDate: string
): Observation | null {
  const target =
    new Date(
      `${targetDate}T23:59:59Z`
    ).getTime();

  const valid = series.filter(
    (item) =>
      new Date(
        `${item.period}T00:00:00Z`
      ).getTime() <= target
  );

  if (valid.length === 0) {
    return null;
  }

  return valid[valid.length - 1];
}

function subtractDays(
  date: string,
  days: number
) {
  const d = new Date(
    `${date}T00:00:00Z`
  );

  d.setUTCDate(
    d.getUTCDate() - days
  );

  return d
    .toISOString()
    .slice(0, 10);
}

function calculateGapDays(
  dateA: string,
  dateB: string
) {
  const a = new Date(
    `${dateA}T00:00:00Z`
  ).getTime();

  const b = new Date(
    `${dateB}T00:00:00Z`
  ).getTime();

  return Math.round(
    Math.abs(a - b) /
      (24 * 60 * 60 * 1000)
  );
}

export async function GET(
  request: Request
) {
  const authHeader =
    request.headers.get(
      "authorization"
    );

  if (
    authHeader !==
    `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const [
      auSeries,
      usSeries,
    ] = await Promise.all([
      getDbnomicsSeries(
        "https://api.db.nomics.world/v22/series/RBA/F2/FCMYGBAG2D?observations=1"
      ),

      getDbnomicsSeries(
        "https://api.db.nomics.world/v22/series/FED/H15/RIFLGFCY02_N.B?observations=1"
      ),
    ]);

    const auLatest =
      getLatest(auSeries);

    const usLatest =
      getLatest(usSeries);

    if (!auLatest || !usLatest) {
      return NextResponse.json(
        {
          error:
            "Yield data unavailable",
        },
        {
          status: 500,
        }
      );
    }

    // =====================================================
    // CURRENT LATEST AVAILABLE SPREAD
    // =====================================================

    const currentSpread =
      auLatest.value -
      usLatest.value;

    const dataGapDays =
      calculateGapDays(
        auLatest.period,
        usLatest.period
      );

    // =====================================================
    // APPROX. 1-WEEK PRIOR BASKET
    // =====================================================

    const auPreviousTarget =
      subtractDays(
        auLatest.period,
        7
      );

    const usPreviousTarget =
      subtractDays(
        usLatest.period,
        7
      );

    const auPrevious =
      getClosestAtOrBefore(
        auSeries,
        auPreviousTarget
      );

    const usPrevious =
      getClosestAtOrBefore(
        usSeries,
        usPreviousTarget
      );

    let previousSpread:
      | number
      | null = null;

    let spreadChange1WBps:
      | number
      | null = null;

    if (
      auPrevious &&
      usPrevious
    ) {
      previousSpread =
        auPrevious.value -
        usPrevious.value;

      // Yield values are percentage points.
      // 0.01 percentage point = 1 basis point.
      spreadChange1WBps =
        (currentSpread -
          previousSpread) *
        100;
    }

    // =====================================================
    // SAVE SNAPSHOT
    // =====================================================

    const {
      data: existing,
      error: existingError,
    } = await supabaseAdmin
      .from("yield_snapshots")
      .select("id")
      .eq(
        "au_reference_date",
        auLatest.period
      )
      .eq(
        "us_reference_date",
        usLatest.period
      )
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    const payload = {
      au_2y:
        auLatest.value,

      au_reference_date:
        auLatest.period,

      us_2y:
        usLatest.value,

      us_reference_date:
        usLatest.period,

      spread:
        currentSpread,

      data_gap_days:
        dataGapDays,

      previous_spread:
        previousSpread,

      spread_change_1w_bps:
        spreadChange1WBps,

      au_previous_reference_date:
        auPrevious?.period ?? null,

      us_previous_reference_date:
        usPrevious?.period ?? null,

      last_checked_at:
        new Date().toISOString(),

      source:
        "RBA + Federal Reserve via DBnomics",
    };

    if (existing) {
      const { error } =
        await supabaseAdmin
          .from(
            "yield_snapshots"
          )
          .update(payload)
          .eq(
            "id",
            existing.id
          );

      if (error) {
        throw error;
      }
    } else {
      const { error } =
        await supabaseAdmin
          .from(
            "yield_snapshots"
          )
          .insert(payload);

      if (error) {
        throw error;
      }
    }

    return NextResponse.json({
      updated: true,

      current: {
        australia2Y:
          auLatest.value,

        australiaDate:
          auLatest.period,

        us2Y:
          usLatest.value,

        usDate:
          usLatest.period,

        spread:
          Number(
            currentSpread.toFixed(3)
          ),

        dataGapDays,
      },

      previousApprox1W: {
        australia2Y:
          auPrevious?.value ??
          null,

        australiaDate:
          auPrevious?.period ??
          null,

        us2Y:
          usPrevious?.value ??
          null,

        usDate:
          usPrevious?.period ??
          null,

        spread:
          previousSpread !== null
            ? Number(
                previousSpread.toFixed(
                  3
                )
              )
            : null,
      },

      spreadChange1WBps:
        spreadChange1WBps !== null
          ? Number(
              spreadChange1WBps.toFixed(
                1
              )
            )
          : null,

      signal:
        spreadChange1WBps === null
          ? "WAITING"
          : spreadChange1WBps > 0
            ? "AUD POSITIVE"
            : spreadChange1WBps < 0
              ? "AUD NEGATIVE"
              : "NEUTRAL",
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error:
          "Unexpected yield error",

        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status: 500,
      }
    );
  }
}