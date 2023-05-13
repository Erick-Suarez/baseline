import { NavMenu } from "@/components/sidebar/navMenu";
import { createHumanProfileFromName, profileImageSizes } from "@/utils/images";
import { ProjectSelectDropbox } from "@/components/projectSelectDropbox";
import { RiLogoutBoxRLine } from "react-icons/ri";
import { signOut, useSession } from "next-auth/react";
import { destroyCookie } from "nookies";

const _bottomSection = (
  <div className="flex flex-col items-center gap-5">
    <a
      href="https://airtable.com/shrfHtItC1MjAJrZ9"
      target="_blank"
      rel="noopener noreferrer"
    >
      <button className="mb-10 rounded-md bg-black px-6 py-2 font-bold text-white hover:bg-slate-800">
        Submit Feedback
      </button>
    </a>
    <button
      className="flex items-center gap-1 text-slate-600 hover:text-indigo-600"
      onClick={() => {
        destroyCookie(null, "baseline.access-token");
        localStorage.removeItem("baseline.context");
        signOut({ callbackUrl: "/auth/login" });
      }}
    >
      Log out
      <RiLogoutBoxRLine />
    </button>
    <p className="relative font-semibold text-slate-600">
      Powered by Baseline{" "}
      <span className="rounded-full bg-indigo-200 px-2 py-1 text-xs text-indigo-600">
        Beta
      </span>
    </p>
  </div>
);

//TODO: Remove eslint disable when we switch to optimized nextjs images
/* eslint-disable */
export const Sidebar = () => {
  const { data, status } = useSession();

  return (
    <div className="flex h-full w-[300px] flex-col items-center justify-between border-r border-slate-300 px-3 py-10">
      <div className="flex w-full flex-col items-center justify-center">
        {data
          ? createHumanProfileFromName(data.user.name, profileImageSizes.LARGE)
          : "Loading"}
        <h1 className="mb-1 text-xl font-bold">
          {data ? data.user.name : "Loading"}
        </h1>
        <h2 className="text-md text-slate-600">
          {data ? data.user.organization.organization_name : "Loading"}
        </h2>
      </div>
      <div className="mt-8 h-full w-full flex-grow">
        <ProjectSelectDropbox />
        <div className="mt-10 w-full">
          {data && <NavMenu loggedInUser={data.user} />}
        </div>
      </div>
      {_bottomSection}
    </div>
  );
};
