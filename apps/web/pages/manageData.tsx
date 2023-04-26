import { ProjectDataTable } from "@/components/dataSyncTable";
import { SyncWithGithubButton } from "@/components/syncWithGithub";
import { useCallback, useContext, useEffect, useState } from "react";
import { BaselineContext } from "@/context/baselineContext";
import { useSession } from "next-auth/react";
import { DataSyncs } from "@/types/project";
import { parseCookies } from "nookies";
import {
  Project,
  geRepositoriesWithEmbeddingsForOrganizationIdResponse,
} from "@baselinedocs/shared";
import { defaultGPTProject } from "./_app";

export default function ManageDataPage({}: {}) {
  const session = useSession();
  const {
    dataSyncs,
    setDataSyncs,
    projects: SyncedProjects,
    setProjects,
    setCurrentProject,
    refreshDep,
  } = useContext(BaselineContext);
  const [initialLoadComplete, setInitialLoadComplete] =
    useState<boolean>(false);
  const [loading, setLoading] = useState(false);
  const [errorDuringFetching, setErrorDuringFetching] = useState(false);

  useEffect(() => {
    // Once we add more Data Syncs this is where we will set them
    const setDataSyncsFromProjects = (projects: Array<Project>) => {
      const updatedDataSyncs = { github: false };

      projects.forEach((project) => {
        if (project.source === "github") {
          updatedDataSyncs.github = true;
        }
      });

      // Only update if a change actually happened
      if (dataSyncs.github != updatedDataSyncs.github) {
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
        .then((res) => res.json())
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
          if (projects.length === 0) {
            setCurrentProject(null);
          }
        })
        .catch((err) => {
          console.error(err);
          setErrorDuringFetching(true);
        })
        .finally(() => {
          setLoading(false);
          setInitialLoadComplete(true);
        });
    };

    let interval: NodeJS.Timer;
    if (session.data && session.status === "authenticated") {
      if (!initialLoadComplete) {
        fetchProjects(session.data.user.organization.organization_id);
      } else {
        interval = setInterval(() => {
          fetchProjects(session.data.user.organization.organization_id);
        }, 10000);
      }
    }

    return () => {
      clearInterval(interval);
    };
  }, [
    session,
    dataSyncs,
    setProjects,
    setCurrentProject,
    setDataSyncs,
    refreshDep,
    initialLoadComplete,
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
        {!errorDuringFetching && (
          <SyncWithGithubButton
            alreadySynced={dataSyncs.github}
            organization_id={organization_id}
            onSync={(updatedSyncs: DataSyncs) => {
              setDataSyncs(updatedSyncs);
            }}
          />
        )}
      </div>
    );
  }
}
