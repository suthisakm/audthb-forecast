import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-server";

type GoldApiResponse = {
  name?: string;
  symbol?: string;
  price?: number;
  currency?: string;
  updatedAt?: string;
};

type CommodityResult = {
  symbol: string;
  price?: number;
  marketTimestamp?: string;
  source: string;
  saved: boolean;
  error: string | null;
};

// =========================================================
// GOLD
// =========================================================

async function fetchGold(): Promise<CommodityResult> {
  try {
    const response = await fetch(
      "https://api.gold-api.com/price/XAU",
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return {
        symbol: "GOLD_XAUUSD",
        source: "gold-api.com",
        saved: false,
        error: `Gold API HTTP ${response.status}`,
      };
    }

    const data =
      (await response.json()) as GoldApiResponse;

    const price = Number(data.price);

    if (!Number.isFinite(price)) {
      return {
        symbol: "GOLD_XAUUSD",
        source: "gold-api.com",
        saved: false,
        error: "Invalid gold price",
      };
    }

    // ใช้ timestamp จาก provider ถ้ามี
    // ถ้าไม่มีให้ใช้เวลาที่ระบบดึง
    let marketTimestamp =
      new Date().toISOString();

    if (data.updatedAt) {
      const providerTime =
        new Date(data.updatedAt);

      if (
        !Number.isNaN(
          providerTime.getTime()
        )
      ) {
        marketTimestamp =
          providerTime.toISOString();
      }
    }

    const { error } =
      await supabaseAdmin
        .from("commodity_prices")
        .upsert(
          {
            symbol: "GOLD_XAUUSD",
            price,
            market_timestamp:
              marketTimestamp,
            source: "gold-api.com",
          },
          {
            onConflict:
              "symbol,market_timestamp",
          }
        );

    return {
      symbol: "GOLD_XAUUSD",
      price,
      marketTimestamp,
      source: "gold-api.com",
      saved: !error,
      error:
        error?.message ?? null,
    };
  } catch (error) {
    return {
      symbol: "GOLD_XAUUSD",
      source: "gold-api.com",
      saved: false,
      error:
        error instanceof Error
          ? error.message
          : "Unknown gold error",
    };
  }
}

// =========================================================
// MAIN
// =========================================================

export async function GET(
  request: Request
) {
  // -------------------------------------------------------
  // AUTH
  // -------------------------------------------------------

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
    const results =
      await Promise.all([
        fetchGold(),

        // Brent จะเพิ่มตรงนี้
        // เมื่อ EIA พร้อม

        // Iron Ore จะเพิ่มตรงนี้
        // หลังเลือก commercial-safe source
      ]);

    const failed =
      results.filter(
        (item) =>
          !item.saved
      );

    return NextResponse.json({
      group: "commodity",

      updated:
        failed.length === 0,

      coverage: {
        gold: true,
        brent: false,
        ironOre: false,
      },

      savedCount:
        results.filter(
          (item) =>
            item.saved
        ).length,

      failedCount:
        failed.length,

      results,
    });
  } catch (error) {
    console.error(
      "Commodity route error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Unexpected commodity error",

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