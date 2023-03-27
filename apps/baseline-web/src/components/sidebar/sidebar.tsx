import { NavMenu } from '@components/sidebar/navMenu';
import { Link, useRoute } from 'wouter';

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
    <div className="flex h-full w-[250px] flex-col items-center justify-between border-r border-slate-200 px-3 py-10">
      <div className="mb-20 flex w-full flex-col items-center justify-center gap-2">
        <img
          src="https://i.guim.co.uk/img/media/699cce4914b90ae0ba89787178bc48314d50eb89/0_215_5081_3048/master/5081.jpg?width=1200&height=1200&quality=85&auto=format&fit=crop&s=20e357d35de3b2adeb09c3b400520d39"
          alt="Profile photo"
          className="h-[auto] w-[50%] rounded-full"
        />
        <h1 className="text-2xl font-bold">Santiago Uriarte</h1>
        <h2 className="text-lg text-slate-600">Baseline Company</h2>
      </div>
      <NavMenu />
      {_bottomSection}
    </div>
  );
};
