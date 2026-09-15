import {
  NextResponse,
} from "next/server";

export async function GET(
  request: Request
) {
  // =====================================================
  // OUR API AUTH
  // =====================================================

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

  // =====================================================
  // BOT API KEY
  // =====================================================

  const botApiKey =
    process.env.BOT_API_KEY;

  if (!botApiKey) {
    return NextResponse.json(
      {
        error:
          "Missing BOT_API_KEY",
      },
      {
        status: 500,
      }
    );
  }

  try {
    const url =
      "https://gateway.api.bot.or.th/PolicyRate/v3/policy_rate/get";

    const response =
      await fetch(
        url,
        {
          method:
            "GET",

          headers: {
            Authorization:
              botApiKey,

            Accept:
              "application/json",
          },

          cache:
            "no-store",
        }
      );

    const text =
      await response.text();

    let body:
      unknown;

    try {
      body =
        JSON.parse(text);
    } catch {
      body =
        text;
    }

    return NextResponse.json({
      httpStatus:
        response.status,

      ok:
        response.ok,

      body,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          "BOT API request failed",

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