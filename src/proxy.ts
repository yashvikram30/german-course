import { NextResponse, type NextRequest } from "next/server";

// A quick check that there is a session cookie at all. The signature is verified on the server (src/lib/auth.ts),
// which is what the data functions rely on; this only sends visitors without a cookie to the login page.
export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname === "/login" || req.cookies.has("session")) return NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  return NextResponse.redirect(new URL("/login", req.url));
}

export const config = {
  // Skip Next's own files and the static assets in /public (audio, icons, images).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|audio/|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico|mp3|woff2?)$).*)"],
};
