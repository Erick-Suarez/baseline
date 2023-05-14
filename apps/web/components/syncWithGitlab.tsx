import { RiGitlabFill } from "react-icons/ri";
import classNames from "classnames";
import { DataSyncs } from "@/types/project";
import { useContext } from "react";
import { BaselineContext } from "@/context/baselineContext";
import { parseCookies } from "nookies";

export const SyncWithGitlabButton = ({
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
  const clientId = process.env.NEXT_PUBLIC_GITLAB_CLIENT_ID;
  const redirect_uri = process.env.NEXT_PUBLIC_GITLAB_REDIRECT_URI;
  // Create state to persist between calls to the backend
  const stateObj = encodeURIComponent(
    JSON.stringify({
      organization_id,
    })
  );

  function _resyncGitlab(organization_id: string) {
    const resyncConfirm = window.confirm(
      "Are you sure you want to resync Gitlab? This will delete all current Gitlab repositories"
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
          source: "gitlab",
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
          setDataSyncs({ gitlab: true, github: false });
          _resyncGitlab(organization_id);
        } else {
          window.location.href = `https://gitlab.com/oauth/authorize?client_id=${clientId}&redirect_uri=${redirect_uri}&response_type=code&state=${stateObj}&scope=read_api+read_user+read_repository`;
        }
      }}
      className={classNames(
        "group flex items-center justify-center gap-2 rounded-md border px-6 py-4 font-bold",
        {
          "bg-slate-300 text-slate-400 hover:bg-black hover:text-white":
            alreadySynced,
          "bg-orange-600 text-white hover:bg-orange-800 ": !alreadySynced,
        }
      )}
    >
      <RiGitlabFill className="h-5 w-5" />
      <h1 className="">
        {alreadySynced ? "Resync Gitlab" : "Sync with Gitlab"}
      </h1>
    </button>
  );
};
