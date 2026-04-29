import type { NextAuthOptions } from "next-auth";
import Google from "next-auth/providers/google";

const googleId = process.env.AUTH_GOOGLE_ID;
const googleSecret = process.env.AUTH_GOOGLE_SECRET;

export const authOptions: NextAuthOptions = {
  providers: googleId && googleSecret ? [Google({ clientId: googleId, clientSecret: googleSecret })] : [],
  session: {
    strategy: "jwt",
  },
};
