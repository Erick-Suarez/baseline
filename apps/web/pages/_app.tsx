import { BaselineContext } from "@/context/baselineContext";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Children, cloneElement, useContext, useEffect, useState } from "react";
import { SessionProvider, useSession } from "next-auth/react";
import { DataSyncs } from "@/types/project";
import {
  geRepositoriesWithEmbeddingsForOrganizationIdResponse,
  getDataSyncsForOrganizationResponse,
  Project,
} from "@baselinedocs/shared";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Array<Project>>([]);
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

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    const fetchProjects = () => {
      if (session.data) {
        fetch(
          `http://localhost:3000/projects/${session.data.user.organization.organization_id}`
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

              setProjects(projects);
              if (projects.length === 0) {
                setCurrentProject(null);
              }

              if (router.asPath === "/manageData") {
                timeoutId = setTimeout(fetchProjects, 10000);
              }
            }
          )
          .catch((err) => {
            console.error(err);
          });
      }
    };

    fetchProjects();

    return () => clearTimeout(timeoutId);
  }, [
    dataSyncs,
    session.data,
    setCurrentProject,
    setProjects,
    router.asPath,
    props.refresh,
  ]);

  useEffect(() => {
    if (session.data) {
      fetch(
        `http://localhost:3000/data-sync/${session.data.user.organization.organization_id}`
      )
        .then((res) => res.json())
        .then((data: getDataSyncsForOrganizationResponse) =>
          setDataSyncs(data)
        );
    }
  }, [session.data, setDataSyncs]);
  const clonedChild = cloneElement(Children.only(props.children), props);
  return <div>{clonedChild}</div>;
};
