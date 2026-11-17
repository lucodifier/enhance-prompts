import { getServerSession } from "next-auth/next"
import { type NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"

const googleClientId = process.env.GOOGLE_CLIENT_ID
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
const nextAuthSecret = process.env.NEXTAUTH_SECRET

if (!googleClientId || !googleClientSecret || !nextAuthSecret) {
  throw new Error("Missing required authentication environment variables.")
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  ],
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub ?? session.user.email ?? ""
      }
      return session
    },
  },
  secret: nextAuthSecret,
}

export async function getCurrentUser() {
  const session = await getServerSession(authOptions)
  return session?.user ?? null
}
