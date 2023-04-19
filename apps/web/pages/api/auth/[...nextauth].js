import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: { schema: "main" },
  }
);

export const authOptions = {
  pages: {
    signIn: "/auth/login",
  },
  // Configure one or more authentication providers
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.profile_pic = user.profile_pic;
        token.email_verified = user.email_verified;
        token.organization = {
          organization_id: user.organization_members[0].organization_id,
          organization_name: user.organizations[0].organization_name,
        };
      }

      return token;
    },
    async session({ session, token }) {
      session.user.image = token.profile_pic;
      session.user.email_verified = token.email_verified === true;
      session.user.organization = token.organization;

      return session;
    },
  },
  providers: [
    CredentialsProvider({
      // The name to display on the sign in form (e.g. 'Sign in with...')
      name: "Credentials12",
      // The credentials is used to generate a suitable form on the sign in page.
      // You can specify whatever fields you are expecting to be submitted.
      // e.g. domain, username, password, 2FA token, etc.
      // You can pass any HTML attribute to the <input> tag through the object.
      async authorize(credentials, req) {
        // You need to provide your own logic here that takes the credentials
        // submitted and returns either a object representing a user or value
        // that is false/null if the credentials are invalid.
        // e.g. return { id: 1, name: 'J Smith', email: 'jsmith@example.com' }
        // You can also use the `req` object to obtain additional parameters
        // (i.e., the request IP address)

        const { data, error } = await supabase
          .from("users")
          .select(
            "*, organization_members(organization_id), organizations(organization_name)"
          )
          .eq("email", credentials.username);

        console.log(data);

        if (error || data.length === 0) {
          console.error(error);
          return null;
        }

        return data[0];
      },
    }),
  ],
};
export default NextAuth(authOptions);
