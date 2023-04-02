import { NavMenu } from '@components/sidebar/navMenu';
import { Link } from 'wouter';
import { HUMAN_PROFILE_IMAGE } from '@utils/images';
const _bottomSection = (
  <div className="flex flex-col items-center gap-5">
    <Link href="/settings">
      <a className="text-slate-600 hover:text-indigo-600">Settings</a>
    </Link>
    <p className="font-semibold text-slate-600">Powered by Baseline</p>
  </div>
);

export const Sidebar = () => {
  return (
    <div className="flex h-full w-[300px] flex-col items-center justify-between border-r border-slate-300 px-3 py-10">
      <div className="mb-20 flex w-full flex-col items-center justify-center">
        <img
          src={HUMAN_PROFILE_IMAGE}
          alt="Profile photo"
          className="mb-5 h-32 w-32 rounded-full object-cover"
        />
        <h1 className="mb-1 text-xl font-bold">Magnus Cashington</h1>
        <h2 className="text-md text-slate-600">Baseline Company</h2>
      </div>
      <NavMenu />
      {_bottomSection}
    </div>
  );
};
