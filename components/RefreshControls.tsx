"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function RefreshControls() {
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);

  function refreshData() {
    setIsRefreshing(true);

    router.refresh();

    setTimeout(() => {
      setIsRefreshing(false);
    }, 700);
  }

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [router]);

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm text-slate-400">
        Auto refresh: 60s
      </span>

      <button
        onClick={refreshData}
        disabled={isRefreshing}
        className="rounded-lg bg-slate-800 px-4 py-2 text-sm hover:bg-slate-700 disabled:opacity-50"
      >
        {isRefreshing ? "Refreshing..." : "Refresh"}
      </button>
    </div>
  );
}