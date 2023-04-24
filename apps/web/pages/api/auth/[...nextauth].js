import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import * as jwt from "jsonwebtoken";
import { setCookie } from "nookies";

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: { schema: "main" },
  }
);

export const nextAuthOptions = (req, res) => {
  return {
    pages: {
      signIn: "/auth/login",
    },
    session: {
      maxAge: 60 * 60 * 24,
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
          const { data, error } = await supabase
            .from("users")
            .select(
              "*, organization_members(organization_id), organizations(organization_name)"
            )
            .eq("email", credentials.username);

          if (error || data.length === 0) {
            console.error(error);
            return null;
          }

          // Generate JWT for backend
          const user = {
            user_id: data[0].user_id,
            organization_id: data[0].organization_members[0].organization_id,
          };

          console.log("user from supabase: ", user);

          const accessToken = jwt.sign(user, process.env.JWT_SECRET, {
            expiresIn: "1d",
          });
          console.log("accessToken set to: ", accessToken);

          setCookie({ res }, "baseline.access-token", accessToken, {
            maxAge: 60 * 60 * 24,
            path: "/",
            httpOnly: true,
            sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
            secure: process.env.NODE_ENV === "production" ? true : false,
          });
          console.log("cookied set");
          return data[0];
        },
      }),
    ],
  };
};

const nextAuth = (req, res) => {
  return NextAuth(req, res, nextAuthOptions(req, res));
};

export default nextAuth;
