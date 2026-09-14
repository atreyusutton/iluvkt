import "server-only";
import { cookies } from "next/headers";
import { isValidSessionToken, SESSION_COOKIE } from "./auth";

/** Server Actions and Route Handlers are reachable by direct POST, so each one checks auth itself. */
export async function requireAuth() {
  const cookieStore = await cookies();
  if (!(await isValidSessionToken(cookieStore.get(SESSION_COOKIE)?.value))) {
    throw new Error("Unauthorized");
  }
}
