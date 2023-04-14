import { RiGithubFill } from "react-icons/ri";
import classNames from "classnames";

export const SyncWithGithubButton = ({
  onClick,
  alreadySynced,
}: {
  onClick?: () => void;
  alreadySynced?: boolean;
}) => {
  const clientId = "7f87d72bbee3e1f28624";

  return (
    <a
      href={`https://github.com/login/oauth/authorize?client_id=${clientId}&scope=repo`}
      rel="noreferrer noopener"
      className={classNames({
        "pointer-events-none": alreadySynced,
      })}
    >
      <button
        onClick={onClick}
        disabled={alreadySynced}
        className={classNames(
          "group flex items-center justify-center gap-2 rounded-md border px-6 py-4 font-bold disabled:pointer-events-none",
          {
            "bg-slate-300 text-slate-400": alreadySynced,
            "bg-indigo-600 text-white hover:bg-indigo-800 ": !alreadySynced,
          }
        )}
      >
        <RiGithubFill className="h-5 w-5" />
        <h1 className="">
          {alreadySynced ? "Github sync complete" : "Sync with Github"}
        </h1>
      </button>
    </a>
  );
};
