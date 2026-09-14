"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function RefreshControls() {
  const router = useRouter();

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [router]);

  // ไม่แสดง UI
  return null;
}