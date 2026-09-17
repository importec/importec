import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSessionCookie = Boolean(req.cookies.get("session")?.value);
  const isPublicRoute = PUBLIC_ROUTES.includes(pathname);

  // Chequeo optimista (solo mira si existe la cookie, no la valida contra la
  // base). La verificacion real y las reglas de autorizacion viven en
  // src/lib/auth/session.ts y se ejecutan en cada Server Component/Action.
  if (!isPublicRoute && !hasSessionCookie) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isPublicRoute && hasSessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
