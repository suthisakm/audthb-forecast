import {
  NextResponse,
} from "next/server";

// =========================================================
// TYPES
// =========================================================

type CkanResource = {
  id?: string;
  name?: string;
  format?: string;
  url?: string;

  datastore_active?: boolean;

  created?: string;
  last_modified?: string;
};

type CkanPackage = {
  id?: string;
  name?: string;
  title?: string;

  metadata_created?: string;
  metadata_modified?: string;

  organization?: {
    title?: string;
    name?: string;
  };

  resources?: CkanResource[];
};

type PackageSearchResponse = {
  success?: boolean;

  result?: {
    count?: number;
    results?: CkanPackage[];
  };
};

// =========================================================
// SEARCH CKAN
// =========================================================

async function searchPackages(
  query: string
) {
  const url =
    "https://www.data.go.th/api/3/action/package_search?" +
    new URLSearchParams({
      q: query,
      rows: "20",
    }).toString();

  const response =
    await fetch(
      url,
      {
        headers: {
          Accept:
            "application/json",
        },

        cache:
          "no-store",

        signal:
          AbortSignal.timeout(
            30000
          ),
      }
    );

  const text =
    await response.text();

  let body:
    PackageSearchResponse;

  try {
    body =
      JSON.parse(
        text
      );
  } catch {
    return {
      ok:
        false,

      httpStatus:
        response.status,

      error:
        "data.go.th package_search returned non-JSON",

      preview:
        text.slice(
          0,
          500
        ),
    };
  }

  const packages =
    body.result
      ?.results ??
    [];

  return {
    ok:
      response.ok &&
      body.success ===
        true,

    httpStatus:
      response.status,

    count:
      body.result
        ?.count ??
      0,

    packages:
      packages.map(
        (
          item
        ) => ({
          id:
            item.id,

          name:
            item.name,

          title:
            item.title,

          organization:
            item.organization
              ?.title ??
            item.organization
              ?.name ??
            null,

          metadataCreated:
            item.metadata_created,

          metadataModified:
            item.metadata_modified,

          resources:
            (
              item.resources ??
              []
            ).map(
              (
                resource
              ) => ({
                id:
                  resource.id,

                name:
                  resource.name,

                format:
                  resource.format,

                datastoreActive:
                  resource.datastore_active ??
                  false,

                created:
                  resource.created,

                lastModified:
                  resource.last_modified,

                url:
                  resource.url,
              })
            ),
        })
      ),
  };
}

// =========================================================
// MAIN
// =========================================================

export async function GET(
  request: Request
) {
  const authHeader =
    request.headers.get(
      "authorization"
    );

  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    );
  }

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
        status:
          401,
      }
    );
  }

  try {
    const [
      exact,
      qgdp,
      chainVolume,
    ] =
      await Promise.all([
        searchPackages(
          "\"Quarterly Gross Domestic product at Chain volume measures\""
        ),

        searchPackages(
          "Quarterly Gross Domestic Product NESDC"
        ),

        searchPackages(
          "Chain volume measures GDP NESDC"
        ),
      ]);

    return NextResponse.json({
      testedAt:
        new Date()
          .toISOString(),

      factor:
        "Thailand Growth Source Discovery",

      source:
        "data.go.th CKAN API",

      searches: {
        exact,
        qgdp,
        chainVolume,
      },

      target: {
        publisher:
          "NESDC",

        metric:
          "Quarterly Gross Domestic Product at Chain Volume Measures",

        desiredResource:
          "CSV or DataStore",

        desiredFrequency:
          "Quarterly",

        desiredFreshness:
          "2026-Q2 or newer",
      },

      note:
        "API discovery only. No database writes.",
    });
  } catch (
    error
  ) {
    console.error(
      "Thailand growth source test error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Thailand growth source test failed",

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