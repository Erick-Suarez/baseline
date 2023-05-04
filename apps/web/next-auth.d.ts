import NextAuth, { DefaultSession } from "next-auth";

/**
 * The shape of the user object returned in the OAuth providers' `profile` callback,
 * or the second parameter of the `session` callback, when using a database.
 */

declare module "next-auth" {
  interface Session {
    user: {
      user_id: string;
      email: string;
      email_verified: boolean;
      image: string | null;
      name: string;
      organization: {
        organization_id: string;
        is_admin: boolean;
        organization_name: string;
      };
    } & DefaultSession["user"];
  }
}
