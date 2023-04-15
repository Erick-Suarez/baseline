import { RiGithubFill } from "react-icons/ri";
import classNames from "classnames";

export const SyncWithGithubButton = ({
  alreadySynced,
  organization_id,
}: {
  alreadySynced?: boolean;
  organization_id: number;
}) => {
  // TODO: Remove this hardcode
  const clientId = "7f87d72bbee3e1f28624";

  // Create state to persist between calls to the backend
  const stateObj = encodeURIComponent(
    JSON.stringify({
      organization_id,
    })
  );

  return (
    <button
      onClick={() => {
        if (alreadySynced) {
          _resyncGithub(organization_id);
        } else {
          _syncWithGithub(
            `https://github.com/login/oauth/authorize?state=${stateObj}&client_id=${clientId}&scope=repo&prompt=select_account`
          );
        }
      }}
      className={classNames(
        "group flex items-center justify-center gap-2 rounded-md border px-6 py-4 font-bold",
        {
          "bg-slate-300 text-slate-400 hover:bg-black hover:text-white":
            alreadySynced,
          "bg-indigo-600 text-white hover:bg-indigo-800 ": !alreadySynced,
        }
      )}
    >
      <RiGithubFill className="h-5 w-5" />
      <h1 className="">
        {alreadySynced ? "Resync Github" : "Sync with Github"}
      </h1>
    </button>
  );
};

function _syncWithGithub(url: string) {
  window.location.href = url;
}

function _resyncGithub(organization_id: number) {
  const resyncConfirm = window.confirm(
    "Are you sure you want to resync Github? This will delete all current Github repositories"
  );

  if (resyncConfirm) {
    // Start resync process
    fetch("http://localhost:3000/data-sync", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        source: "github",
        organization_id,
      }),
    }).then(() => {
      // Reload on success
      window.location.reload();
    });
  }
}
