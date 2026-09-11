import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("market_prices")
    .select("symbol, rate, market_timestamp, source, ingested_at")
    .eq("symbol", "AUD/THB")
    .order("market_timestamp", { ascending: false })
    .limit(1)
    .single();

  if (error) {
    return NextResponse.json(
      {
        error: "Could not load latest price",
        details: error.message,
      },
      { status: 500 }
    );
  }

  return NextResponse.json(data);
}