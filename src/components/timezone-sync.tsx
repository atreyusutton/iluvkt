"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { TIMEZONE_COOKIE } from "@/lib/time";

/** Tells the server the browser's timezone so "today" and streaks use your local day. */
export function TimezoneSync({ serverTimezone }: { serverTimezone: string }) {
  const router = useRouter();
  useEffect(() => {
    const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (zone && zone !== serverTimezone) {
      document.cookie = `${TIMEZONE_COOKIE}=${encodeURIComponent(zone)}; path=/; max-age=31536000; samesite=lax`;
      router.refresh();
    }
  }, [serverTimezone, router]);
  return null;
}
