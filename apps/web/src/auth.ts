import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";

const googleId = process.env.AUTH_GOOGLE_ID;
const googleSecret = process.env.AUTH_GOOGLE_SECRET;
const nextAuthSecret = process.env.NEXTAUTH_SECRET;
const isProd = process.env.NODE_ENV === "production";

export const authOptions: NextAuthOptions = {
  providers: googleId && googleSecret ? [Google({ clientId: googleId, clientSecret: googleSecret })] : [],
  secret: nextAuthSecret,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 24 * 7,
  },
  useSecureCookies: isProd,
  cookies: {
    sessionToken: {
      name: isProd ? "__Secure-next-auth.session-token" : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: isProd,
      },
    },
  },
};
