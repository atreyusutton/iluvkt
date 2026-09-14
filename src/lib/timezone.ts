import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_TIMEZONE, TIMEZONE_COOKIE } from "./time";

/** The browser reports its timezone via cookie so "today" and streaks match your local day. */
export async function getTimezone(): Promise<string> {
  const value = (await cookies()).get(TIMEZONE_COOKIE)?.value;
  if (!value) return DEFAULT_TIMEZONE;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: value });
    return value;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}
