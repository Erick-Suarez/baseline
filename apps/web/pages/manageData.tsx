import { ProjectDataTable } from "@/components/dataSyncTable";
import { SyncWithGithubButton } from "@/components/syncWithGithub";
import { SyncWithGitlabButton } from "@/components/syncWithGitlab";
import {
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { BaselineContext } from "@/context/baselineContext";
import { useSession } from "next-auth/react";
import { DataSyncs } from "@/types/project";
import { parseCookies } from "nookies";
import {
  Project,
  geRepositoriesWithEmbeddingsForOrganizationIdResponse,
} from "@baselinedocs/shared";
import { defaultGPTProject } from "./_app";
import { useRouter } from "next/router";

export default function ManageDataPage({}: {}) {
  const session = useSession();
  const {
    dataSyncs,
    setDataSyncs,
    projects: SyncedProjects,
    setProjects,
    refreshDep,
    setErrors,
  } = useContext(BaselineContext);
  const router = useRouter();
  const [initialLoadComplete, setInitialLoadComplete] =
    useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [errorDuringFetching, setErrorDuringFetching] = useState(false);

  useEffect(() => {
    // Once we add more Data Syncs this is where we will set them
    const setDataSyncsFromProjects = (projects: Array<Project>) => {
      const updatedDataSyncs = { github: false, gitlab: false };

      projects.forEach((project) => {
        if (project.source === "github") {
          updatedDataSyncs.github = true;
        }
        if (project.source === "gitlab") {
          updatedDataSyncs.gitlab = true;
        }
      });

      // Only update if a change actually happened
      if (
        dataSyncs.github != updatedDataSyncs.github ||
        dataSyncs.gitlab != updatedDataSyncs.gitlab
      ) {
        setDataSyncs(updatedDataSyncs);
      }
    };

    const fetchProjects = async (organization_id: string) => {
      setLoading(true);
      fetch(
        `${process.env.NEXT_PUBLIC_BASELINE_BACKEND_URL}/projects/${organization_id}`,
        {
          method: "GET",
          headers: {
            Authorization: `BEARER ${parseCookies()["baseline.access-token"]}`,
          },
        }
      )
        .then((res) => {
          if (!res.ok) {
            throw new Error(`Server responded with ${res.status}`);
          }
          return res.json();
        })
        .then((data: geRepositoriesWithEmbeddingsForOrganizationIdResponse) => {
          const projects: Array<Project> = [];

          data.forEach((repo) => {
            projects.push({
              id: repo.repo_id,
              name: repo.repo_name,
              display_name: repo.full_name,
              source: repo.data_syncs.source,
              index_list: repo.embedding_indexes,
            });
          });

          setProjects([...projects, defaultGPTProject]);
          setDataSyncsFromProjects(projects);
        })
        .catch((err) => {
          console.error(err);
          setErrors([
            {
              message:
                "Error connecting to server, please try re-logging or servers may be down.",
              type: 500,
            },
          ]);

          setErrorDuringFetching(true);
        })
        .finally(() => {
          setLoading(false);
        });
    };

    let interval: NodeJS.Timer;
    if (session.data && session.status === "authenticated") {
      if (!session.data.user.organization.is_admin) {
        // Redirect if not admin
        router.push("/chat");
      } else {
        setInitialLoadComplete(true);
        fetchProjects(session.data.user.organization.organization_id);
        interval = setInterval(() => {
          fetchProjects(session.data.user.organization.organization_id);
        }, 10000);
      }
    }

    return () => {
      clearInterval(interval);
    };
  }, [
    dataSyncs.github,
    router,
    session.data,
    session.status,
    setDataSyncs,
    setProjects,
    refreshDep,
    setErrors,
  ]);

  if (!initialLoadComplete) {
    return <div>Loading</div>;
  } else {
    const organization_id = session.data!.user.organization.organization_id;
    const projects = SyncedProjects;

    return (
      <div className="mt-20 flex w-full flex-col items-center justify-center gap-8">
        <h1 className="text-4xl font-bold">Manage Data Syncs</h1>

        <div className="w-full max-w-7xl overflow-y-auto px-10">
          <ProjectDataTable
            projects={projects}
            showErrorMessage={errorDuringFetching}
          />
        </div>

        <div className="flex w-full items-center justify-center gap-8">
          {!errorDuringFetching && (
            <SyncWithGithubButton
              alreadySynced={dataSyncs.github}
              organization_id={organization_id}
              onSync={(updatedSyncs: DataSyncs) => {
                setDataSyncs(updatedSyncs);
              }}
            />
          )}
          {!errorDuringFetching && (
            <SyncWithGitlabButton
              alreadySynced={dataSyncs.gitlab}
              organization_id={organization_id}
              onSync={(updatedSyncs: DataSyncs) => {
                setDataSyncs(updatedSyncs);
              }}
            />
          )}
        </div>
      </div>
    );
  }
}
