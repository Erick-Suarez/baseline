import { RiGithubFill } from "react-icons/ri";
import classNames from "classnames";
import { DataSyncs } from "@/types/project";
import { useContext } from "react";
import { BaselineContext } from "@/context/baselineContext";
import { parseCookies } from "nookies";

export const SyncWithGithubButton = ({
  alreadySynced,
  organization_id,
  onSync,
}: {
  alreadySynced?: boolean;
  organization_id: string;
  onSync: (arg: DataSyncs) => void;
}) => {
  const { forceRefresh } = useContext(BaselineContext);

  const { setDataSyncs } = useContext(BaselineContext);
  const clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
  // Create state to persist between calls to the backend
  const stateObj = encodeURIComponent(
    JSON.stringify({
      organization_id,
    })
  );

  function _resyncGithub(organization_id: string) {
    const resyncConfirm = window.confirm(
      "Are you sure you want to resync Github? This will delete all current Github repositories"
    );

    if (resyncConfirm) {
      // Start resync process
      fetch(`${process.env.NEXT_PUBLIC_BASELINE_BACKEND_URL}/data-sync`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `BEARER ${parseCookies()["baseline.access-token"]}`,
        },
        body: JSON.stringify({
          source: "github",
          organization_id,
        }),
      }).then(() => {
        // Reload on success
        forceRefresh();
      });
    }
  }
  return (
    <button
      onClick={() => {
        if (alreadySynced) {
          setDataSyncs({ github: true, gitlab: false });
          _resyncGithub(organization_id);
        } else {
          window.location.href = `https://github.com/login/oauth/authorize?state=${stateObj}&client_id=${clientId}&scope=repo&prompt=select_account`;
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
