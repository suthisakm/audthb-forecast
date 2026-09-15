import {
  NextResponse,
} from "next/server";

// =========================================================
// HELPERS
// =========================================================

function decodeHtml(
  value: string
) {
  return value
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function htmlToText(
  html: string
) {
  return decodeHtml(
    html
      .replace(
        /<script[\s\S]*?<\/script>/gi,
        " "
      )
      .replace(
        /<style[\s\S]*?<\/style>/gi,
        " "
      )
      .replace(
        /<[^>]+>/g,
        " "
      )
      .replace(
        /\s+/g,
        " "
      )
      .trim()
  );
}

// =========================================================
// EXTRACT INDICATOR
//
// Expected visible text:
//
// Headline Inflation (%YoY)
// 2.53%
// Aug 2026
//
// Core Inflation (%YoY)
// 1.44%
// Aug 2026
// =========================================================

function extractIndicator(
  text: string,
  label:
    | "Headline Inflation"
    | "Core Inflation"
) {
  const escapedLabel =
    label.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&"
    );

  // -------------------------------------------------------
  // Try:
  // Headline Inflation (%YoY) 2.53% Aug 2026
  // -------------------------------------------------------

  const pattern =
    new RegExp(
      escapedLabel +
        String.raw`\s*\(%YoY\)\s*` +
        String.raw`(-?\d+(?:\.\d+)?)%\s*` +
        String.raw`([A-Za-z]+)\s+(\d{4})`,
      "i"
    );

  const match =
    text.match(
      pattern
    );

  if (!match) {
    return null;
  }

  const value =
    Number(
      match[1]
    );

  if (
    !Number.isFinite(
      value
    )
  ) {
    return null;
  }

  return {
    yoy:
      value,

    month:
      match[2],

    year:
      Number(
        match[3]
      ),

    raw:
      match[0],
  };
}

// =========================================================
// DEBUG SNIPPET
// =========================================================

function getSnippet(
  text: string,
  keyword: string
) {
  const index =
    text
      .toLowerCase()
      .indexOf(
        keyword.toLowerCase()
      );

  if (
    index === -1
  ) {
    return null;
  }

  const start =
    Math.max(
      0,
      index - 100
    );

  const end =
    Math.min(
      text.length,
      index + 300
    );

  return text.slice(
    start,
    end
  );
}

// =========================================================
// MAIN
// =========================================================

export async function GET(
  request: Request
) {
  // =======================================================
  // AUTH
  // =======================================================

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
    // =====================================================
    // FETCH OFFICIAL BOT PAGE
    // =====================================================

    const url =
      "https://www.bot.or.th/en/thai-economy.html";

    const response =
      await fetch(
        url,
        {
          method:
            "GET",

          headers: {
            Accept:
              "text/html",

            "User-Agent":
              "AUDTHB-Forecast/1.0",
          },

          cache:
            "no-store",

          signal:
            AbortSignal.timeout(
              20000
            ),
        }
      );

    const html =
      await response.text();

    if (
      !response.ok
    ) {
      return NextResponse.json(
        {
          ok:
            false,

          httpStatus:
            response.status,

          error:
            "BOT Thai Economy page request failed",
        },
        {
          status: 502,
        }
      );
    }

    // =====================================================
    // CONVERT TO PLAIN TEXT
    // =====================================================

    const text =
      htmlToText(
        html
      );

    // =====================================================
    // EXTRACT
    // =====================================================

    const headline =
      extractIndicator(
        text,
        "Headline Inflation"
      );

    const core =
      extractIndicator(
        text,
        "Core Inflation"
      );

    // =====================================================
    // RESPONSE
    // =====================================================

    return NextResponse.json({
      testedAt:
        new Date()
          .toISOString(),

      provider:
        "Bank of Thailand",

      source:
        "Thai Economy",

      url,

      httpStatus:
        response.status,

      ok:
        response.ok,

      inflation: {
        headline,

        core,
      },

      extraction: {
        headlineFound:
          headline !==
          null,

        coreFound:
          core !==
          null,
      },

      debug: {
        headlineSnippet:
          getSnippet(
            text,
            "Headline Inflation"
          ),

        coreSnippet:
          getSnippet(
            text,
            "Core Inflation"
          ),
      },
    });
  } catch (
    error
  ) {
    return NextResponse.json(
      {
        ok:
          false,

        error:
          "Thailand inflation test failed",

        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      {
        status:
          500,
      }
    );
  }
}