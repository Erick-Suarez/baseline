import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from "next";
import { getProviders, signIn } from "next-auth/react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";

export default function Loginpage({
  providers,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Baseline | Login</title>
      </Head>

      <div className="flex h-[100vh] w-[100vw] items-center justify-center bg-neutral-100">
        <div className="flex w-full max-w-md flex-col items-center justify-center gap-5">
          <h1 className="inline-block border-b-4 border-indigo-600 pb-2 text-6xl font-bold">
            Baseline
          </h1>
          <div className="flex w-full flex-col gap-4 rounded-xl bg-white px-8 py-10 shadow-xl">
            <h1 className="text-xl font-semibold">Sign in to your account</h1>
            {router.query.error === "CredentialsSignin" && (
              <h2 className="mt-[-10px] text-sm text-red-400">
                Invalid Credentials
              </h2>
            )}
            <input
              type="text"
              className="w-full rounded-md border bg-slate-100 p-4 outline-slate-600"
              placeholder="Username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
              }}
            />

            <input
              type="password"
              className="w-full rounded-md border bg-slate-100 p-4 outline-slate-600"
              placeholder="Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  id="remember-me"
                  type="checkbox"
                  className=" h-4 w-4 rounded border-gray-300 bg-gray-100 text-indigo-600 focus:ring-2 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:ring-offset-gray-800 dark:focus:ring-indigo-600"
                />
                <label htmlFor="remember-me">Keep me signed in</label>
              </div>
            </div>

            <button
              className="w-full rounded-md bg-indigo-600 py-4 text-lg font-bold text-white hover:bg-indigo-800"
              onClick={() => {
                signIn("credentials", {
                  username,
                  password,
                  callbackUrl: "/manageData",
                });
              }}
            >
              Sign In
            </button>

            <button className="hover:text-indigo-600">Forgot password?</button>
          </div>
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  const session = await getServerSession(context.req, context.res, authOptions);

  // If the user is already logged in, redirect.
  // Note: Make sure not to redirect to the same page
  // To avoid an infinite loop!
  if (session) {
    return { redirect: { destination: "/chat" } };
  }

  const providers = await getProviders();

  return {
    props: { providers: providers ?? [] },
  };
}
