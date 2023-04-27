import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { createClient } from "@supabase/supabase-js";
import * as jwt from "jsonwebtoken";
import { setCookie } from "nookies";
import * as bcrypt from "bcrypt";

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
      async jwt({ token, user, trigger, session }) {
        if (user) {
          token.user_id = user.user_id;
          token.profile_pic = user.profile_pic;
          token.email_verified = user.email_verified;
          token.organization = {
            organization_id: user.organization_members[0].organization_id,
            organization_name: user.organizations[0].organization_name,
          };
        }

        if (trigger === "update" && session) {
          // Note, that `session` can be any arbitrary object, remember to validate it!
          token.name = session.name;
        }

        return token;
      },
      async session({ session, token, user }) {
        session.user.user_id = token.user_id;
        session.user.name = token.name;
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
            .eq("email", credentials.username)
            .maybeSingle();

          if (error || !data) {
            console.error(error);
            return null;
          }

          // Check Password
          const passwordMatch = await bcrypt.compare(
            credentials.password,
            data.password
          );

          if (!passwordMatch) {
            console.log(
              `Login attempt for ${credentials.username} failed because of wrong password`
            );
            return null;
          }

          // Generate JWT for backend
          const user = {
            user_id: data.user_id,
            organization_id: data.organization_members[0].organization_id,
          };

          const accessToken = jwt.sign(user, process.env.JWT_SECRET, {
            expiresIn: "1d",
          });

          // IMPORTANT Make this cookie have the same maxAge as the expire value in the accessToken above
          // If they are different then the client and server will be out of sync in serving requests to the user
          setCookie({ res }, "baseline.access-token", accessToken, {
            maxAge: 60 * 60 * 24,
            path: "/",
          });

          return data;
        },
      }),
    ],
  };
};

const nextAuth = (req, res) => {
  return NextAuth(req, res, nextAuthOptions(req, res));
};

export default nextAuth;
