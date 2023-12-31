import {
  Project,
  geRepositoriesWithEmbeddingsForOrganizationIdResponse,
} from "@baselinedocs/shared";
import { Sidebar } from "@/components/sidebar/sidebar";
import { BaselineContext } from "@/context/baselineContext";
import { defaultGPTProject } from "@/pages/_app";
import { useSession } from "next-auth/react";
import { parseCookies } from "nookies";
import { useEffect, useState, useContext } from "react";
import { Alerts } from "../alerts";

export const PageWithSidebar = ({ children }: { children: JSX.Element }) => {
  const session = useSession();
  const {
    dataSyncs,
    setDataSyncs,
    projects: SyncedProjects,
    setProjects,
    refreshDep,
    errors,
    setErrors,
  } = useContext(BaselineContext);

  useEffect(() => {
    // TODO: Explore prop drillling from here instead of context
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
        });
    };

    if (session.data && session.status === "authenticated") {
      fetchProjects(session.data.user.organization.organization_id);
    }
  }, [
    dataSyncs.github,
    session.data,
    session.status,
    setDataSyncs,
    setErrors,
    setProjects,
    refreshDep,
  ]);

  return (
    <div className="relative flex h-[100vh] w-[100vw]">
      {errors.length > 0 && <Alerts alertsList={errors} />}
      <Sidebar />

      <div className="h-full w-full flex-grow">{children}</div>
    </div>
  );
};
