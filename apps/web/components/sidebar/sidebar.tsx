import { NavMenu } from "@/components/sidebar/navMenu";
import { HUMAN_PROFILE_IMAGE } from "@/utils/images";
import { ProjectSelectDropbox } from "@/components/projectSelectDropbox";
import { RiLogoutBoxRLine } from "react-icons/ri";
import { signOut, useSession } from "next-auth/react";

const _bottomSection = (
  <div className="flex flex-col items-center gap-5">
    <button
      className="flex items-center gap-1 text-slate-600 hover:text-indigo-600"
      onClick={() => {
        signOut({ callbackUrl: "/auth/login" });
      }}
    >
      Log out
      <RiLogoutBoxRLine />
    </button>
    <p className="font-semibold text-slate-600">Powered by Baseline</p>
  </div>
);

//TODO: Remove eslint disable when we switch to optimized nextjs images
/* eslint-disable */
export const Sidebar = () => {
  const { data, status } = useSession();

  return (
    <div className="flex h-full w-[300px] flex-col items-center justify-between border-r border-slate-300 px-3 py-10">
      <div className="flex w-full flex-col items-center justify-center">
        <img
          src={HUMAN_PROFILE_IMAGE}
          alt="Profile photo"
          className="mb-5 h-32 w-32 rounded-full object-cover"
        />
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
          <NavMenu />
        </div>
      </div>
      {_bottomSection}
    </div>
  );
};
