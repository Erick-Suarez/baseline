import { RiGithubFill } from 'react-icons/ri';

export const ConnectToGithub = () => {
  const clientId = '7f87d72bbee3e1f28624';

  const handleLogin = () => {
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo`;
    window.location.href = authUrl;
  };

  return (
    <button
      className="group flex items-center justify-center gap-2 rounded-md border border-black p-2 py-4 text-lg font-bold text-white hover:bg-slate-200"
      onClick={handleLogin}
    >
      <RiGithubFill className="h-5 w-5 text-slate-600 group-hover:text-slate-600" />
      <h1 className="text-slate-600 group-hover:text-slate-600">
        Sign in with Github
      </h1>
    </button>
  );
};