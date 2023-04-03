import { RiGithubFill } from 'react-icons/ri';
import classNames from 'classnames';
import { Link } from 'wouter';

export const SyncWithGithubButton = ({
  onClick,
  syncComplete,
}: {
  onClick?: () => void;
  syncComplete?: boolean;
}) => {
  const clientId = '7f87d72bbee3e1f28624';

  return (
    <a
      href={`https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo`}
      target="_blank"
      rel="noreferrer noopener"
    >
      <button
        onClick={onClick}
        disabled={syncComplete}
        className={classNames(
          'group flex items-center justify-center gap-2 rounded-md border px-6 py-4 font-bold disabled:pointer-events-none',
          {
            'bg-slate-300 text-slate-400': syncComplete,
            ' bg-indigo-600 text-white hover:bg-indigo-800 ': !syncComplete,
          }
        )}
      >
        <RiGithubFill className="h-5 w-5" />
        <h1 className="">
          {syncComplete ? 'Github sync complete' : 'Sync with Github'}
        </h1>
      </button>
    </a>
  );
};
