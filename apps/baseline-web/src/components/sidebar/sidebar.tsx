import { NavMenu } from '@components/sidebar/navMenu';
import { Link } from 'wouter';
import { HUMAN_PROFILE_IMAGE } from '@utils/images';
import { ProjectSelectDropbox } from '@components/projectSelectDropbox';
import { RiLogoutBoxRLine } from 'react-icons/ri';

const _bottomSection = (
  <div className="flex flex-col items-center gap-5">
    <Link
      href="/login"
      className="flex items-center gap-1 text-slate-600 hover:text-indigo-600"
    >
      <a>Log out</a>
      <RiLogoutBoxRLine />
    </Link>
    <p className="font-semibold text-slate-600">Powered by Baseline</p>
  </div>
);

export const Sidebar = () => {
  return (
    <div className="flex h-full w-[300px] flex-col items-center justify-between border-r border-slate-300 px-3 py-10">
      <div className="flex w-full flex-col items-center justify-center">
        <img
          src={HUMAN_PROFILE_IMAGE}
          alt="Profile photo"
          className="mb-5 h-32 w-32 rounded-full object-cover"
        />
        <h1 className="mb-1 text-xl font-bold">Magnus Cashington</h1>
        <h2 className="text-md text-slate-600">ACME Company</h2>
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
