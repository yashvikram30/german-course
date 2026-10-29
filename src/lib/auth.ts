import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 30; // seconds

function secret() {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) throw new Error("SESSION_SECRET is not set (use at least 16 random characters). Add it to .env and to the host's environment variables.");
  return s;
}

const sign = (payload: string) => createHmac("sha256", secret()).update(payload).digest("base64url");

// ---- passwords: scrypt with a random salt, stored as `salt:hash` ----

const derive = (password: string, salt: Buffer) =>
  new Promise<Buffer>((resolve, reject) => scrypt(password.normalize("NFKC"), salt, 64, (err, key) => (err ? reject(err) : resolve(key))));

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  return `${salt.toString("hex")}:${(await derive(password, salt)).toString("hex")}`;
}

export async function checkPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = await derive(password, Buffer.from(salt, "hex"));
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

// ---- sessions: a signed cookie `userId.expiry.signature`; nothing is stored on the server ----

export async function startSession(userId: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${userId}.${exp}`;
  (await cookies()).set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function endSession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** The signed-in user's id, or null. */
export async function getUserId() {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  const [userId, exp, sig] = raw?.split(".") ?? [];
  if (!userId || !exp || !sig || Number(exp) < Date.now() / 1000) return null;
  const good = Buffer.from(sign(`${userId}.${exp}`));
  const given = Buffer.from(sig);
  return good.length === given.length && timingSafeEqual(good, given) ? userId : null;
}

/** For actions that write: a visitor who is not signed in is sent to the login page. */
export async function requireUserId() {
  const id = await getUserId();
  if (!id) redirect("/login");
  return id;
}
