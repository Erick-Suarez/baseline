import { Link } from 'wouter';

export const Loginpage = () => {
  return (
    <div className="flex h-[100vh] w-[100vw] items-center justify-center bg-neutral-100">
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-5">
        <h1 className="inline-block border-b-4 border-indigo-600 pb-2 text-6xl font-bold">
          Baseline
        </h1>
        <div className="flex w-full flex-col gap-4 rounded-xl bg-white px-8 py-10 shadow-xl">
          <h1 className="text-xl font-semibold">Sign in to your account</h1>
          <input
            type="text"
            className="w-full rounded-md border bg-slate-100 p-4 outline-slate-600"
            placeholder="Username"
          />
          <input
            type="password"
            className="w-full rounded-md border bg-slate-100 p-4 outline-slate-600"
            placeholder="password"
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

          <Link href="/chat">
            <button className="rounded-md bg-indigo-600 py-4 text-lg font-bold text-white hover:bg-indigo-800">
              Sign In
            </button>
          </Link>
          <button className="hover:text-indigo-600">Forgot password?</button>
        </div>
      </div>
    </div>
  );
};
