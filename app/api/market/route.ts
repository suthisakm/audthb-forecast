import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  try {
    const apiKey = process.env.TWELVE_DATA_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing TWELVE_DATA_API_KEY" },
        { status: 500 }
      );
    }

    const url =
      `https://api.twelvedata.com/exchange_rate` +
      `?symbol=AUD/THB` +
      `&apikey=${apiKey}`;

    const response = await fetch(url, {
      cache: "no-store",
    });

    const data = await response.json();

    if (!data.rate || !data.timestamp) {
      return NextResponse.json(
        {
          error: "Invalid response from Twelve Data",
          raw: data,
        },
        { status: 500 }
      );
    }

    const rate = Number(data.rate);

    const marketTimestamp = new Date(
      Number(data.timestamp) * 1000
    ).toISOString();

    const { error } = await supabaseAdmin
      .from("market_prices")
      .upsert(
        {
          symbol: "AUD/THB",
          rate,
          market_timestamp: marketTimestamp,
          source: "twelvedata",
        },
        {
          onConflict: "symbol,market_timestamp",
        }
      );

    if (error) {
      console.error(error);

      return NextResponse.json(
        {
          error: "Could not save price to Supabase",
          details: error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      symbol: "AUD/THB",
      rate,
      marketTimestamp,
      source: "twelvedata",
      saved: true,
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}