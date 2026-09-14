export const SESSION_COOKIE = "iluvkt_session";

async function hmacHex(secret: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Password protection is off when APP_PASSWORD isn't set (local development). */
export function isPasswordProtected(): boolean {
  return Boolean(process.env.APP_PASSWORD);
}

/** The cookie value is derived from the password, so changing the password logs everyone out. */
export async function expectedSessionToken(): Promise<string> {
  const password = process.env.APP_PASSWORD ?? "";
  const secret = process.env.AUTH_SECRET ?? password;
  return hmacHex(secret, `iluvkt-session:${password}`);
}

export async function isValidSessionToken(token: string | undefined): Promise<boolean> {
  if (!isPasswordProtected()) return true;
  if (!token) return false;
  return timingSafeEqual(token, await expectedSessionToken());
}

export async function isCorrectPassword(attempt: string): Promise<boolean> {
  const password = process.env.APP_PASSWORD;
  if (!password) return true;
  // Compare digests so the comparison doesn't leak the password length.
  const [a, b] = await Promise.all([hmacHex("pw", attempt), hmacHex("pw", password)]);
  return timingSafeEqual(a, b);
}
