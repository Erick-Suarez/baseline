/* eslint-disable react-hooks/exhaustive-deps */

import { BaselineContext } from "@/context/baselineContext";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Children, cloneElement, useContext, useEffect, useState } from "react";
import { SessionProvider, signOut, useSession } from "next-auth/react";
import { DataSyncs } from "@/types/project";
import {
  geRepositoriesWithEmbeddingsForOrganizationIdResponse,
  getDataSyncsForOrganizationResponse,
  Project,
} from "@baselinedocs/shared";
import { useRouter } from "next/router";

const defaultGPTProject: Project = {
  id: "-1",
  name: "Default GPT",
  display_name: "Default GPT",
  source: "",
  index_list: [],
};

export default function App({ Component, pageProps }: AppProps) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Array<Project>>([defaultGPTProject]);
  const [dataSyncs, setDataSyncs] = useState<DataSyncs>({
    github: false,
  });

  const [refresh, setRefresh] = useState(false);

  return (
    <SessionProvider session={pageProps.session}>
      <BaselineContext.Provider
        value={{
          currentProject,
          setCurrentProject,
          projects,
          setProjects,
          dataSyncs,
          setDataSyncs,
          forceRefresh: () => setRefresh((prev) => !prev),
        }}
      >
        <_ComponentWithSession refresh={refresh}>
          <Component {...pageProps} />
        </_ComponentWithSession>
      </BaselineContext.Provider>
    </SessionProvider>
  );
}

const _ComponentWithSession = (props: any) => {
  const session = useSession();
  const router = useRouter();
  const { dataSyncs, setProjects, setCurrentProject, setDataSyncs } =
    useContext(BaselineContext);
  const [fetchInProgress, setFetchInProgress] = useState<boolean>(false);

  useEffect(() => {
    let interval: NodeJS.Timer;
    const fetchProjects = () => {
      if (session.data && !fetchInProgress) {
        setFetchInProgress(true);
        fetch(
          `${process.env.NEXT_PUBLIC_BASELINE_SERVER_URL}/projects/${session.data.user.organization.organization_id}`,
          { method: "GET", credentials: "include" }
        )
          .then((res) => res.json())
          .then(
            (data: geRepositoriesWithEmbeddingsForOrganizationIdResponse) => {
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

              if (projects.length === 0) {
                setCurrentProject(null);
              }
            }
          )
          .catch((err) => {
            console.error(err);
          })
          .finally(() => {
            setFetchInProgress(false);
          });
      }
    };

    if (router.asPath === "/manageData") {
      interval = setInterval(fetchProjects, 2000);
    }

    return () => clearInterval(interval);
  }, [dataSyncs, router.asPath, session.data, setCurrentProject, setProjects]);

  useEffect(() => {
    if (session.data) {
      fetch(
        `${process.env.NEXT_PUBLIC_BASELINE_SERVER_URL}/data-sync/${session.data.user.organization.organization_id}`,
        { method: "GET", credentials: "include" }
      )
        .then((res) => res.json())
        .then((data: getDataSyncsForOrganizationResponse) => setDataSyncs(data))
        .catch((err) => {
          //TODO: Handle error
        });
    }
  }, [session.data, setDataSyncs]);
  const clonedChild = cloneElement(Children.only(props.children), props);
  return <div>{clonedChild}</div>;
};
