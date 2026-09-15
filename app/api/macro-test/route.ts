import {
  NextResponse,
} from "next/server";

type DbnomicsResponse = {
  series?: {
    docs?: Array<{
      series_code?: string;
      series_name?: string;
      period?: string[];
      value?: Array<
        number | null
      >;
    }>;
  };
};

function getLatestValid(
  payload: DbnomicsResponse
) {
  const doc =
    payload.series
      ?.docs?.[0];

  if (
    !doc ||
    !doc.period ||
    !doc.value
  ) {
    return null;
  }

  for (
    let i =
      doc.value.length - 1;
    i >= 0;
    i--
  ) {
    const value =
      doc.value[i];

    const period =
      doc.period[i];

    if (
      value !== null &&
      Number.isFinite(
        Number(value)
      ) &&
      period
    ) {
      return {
        value:
          Number(value),

        period,

        series:
          doc.series_code ??
          null,

        name:
          doc.series_name ??
          null,
      };
    }
  }

  return null;
}

async function fetchDbnomics(
  seriesPath: string
) {
  const url =
    `https://api.db.nomics.world/v22/series/${seriesPath}?observations=1`;

  const response =
    await fetch(
      url,
      {
        cache:
          "no-store",
      }
    );

  const body =
    (await response.json()) as DbnomicsResponse;

  return {
    httpStatus:
      response.status,

    ok:
      response.ok,

    body,
  };
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
        error:
          "Unauthorized",
      },
      {
        status: 401,
      }
    );
  }

  try {
    const [
      rbaResult,
      fedResult,
    ] =
      await Promise.all([
        fetchDbnomics(
          "RBA/F1/FIRMMCRTD"
        ),

        fetchDbnomics(
          "FED/H15/RIFSPFF_N.D"
        ),
      ]);

    const rba =
      rbaResult.ok
        ? getLatestValid(
            rbaResult.body
          )
        : null;

    const fed =
      fedResult.ok
        ? getLatestValid(
            fedResult.body
          )
        : null;

    const spread =
      rba &&
      fed
        ? Number(
            (
              rba.value -
              fed.value
            ).toFixed(3)
          )
        : null;

    return NextResponse.json({
      updated:
        Boolean(
          rba &&
          fed
        ),

      rba: {
        httpStatus:
          rbaResult.httpStatus,

        ok:
          rbaResult.ok,

        latest:
          rba,
      },

      fed: {
        httpStatus:
          fedResult.httpStatus,

        ok:
          fedResult.ok,

        latest:
          fed,
      },

      policySpread:
        spread,

      interpretation:
        spread !== null
          ? spread > 0
            ? "AU policy rate above US effective rate"
            : spread < 0
              ? "AU policy rate below US effective rate"
              : "Policy rates approximately equal"
          : null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        updated:
          false,

        error:
          "Macro test failed",

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