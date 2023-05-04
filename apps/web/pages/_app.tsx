import { BaselineContext } from "@/context/baselineContext";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Children, cloneElement, useContext, useEffect, useState } from "react";
import {
  SessionProvider,
  getSession,
  signOut,
  useSession,
} from "next-auth/react";
import { DataSyncs } from "@/types/project";
import {
  geRepositoriesWithEmbeddingsForOrganizationIdResponse,
  getDataSyncsForOrganizationResponse,
  Project,
} from "@baselinedocs/shared";
import { useRouter } from "next/router";
import { parseCookies } from "nookies";
import { PageWithSidebar } from "@/components/layouts/pageWithSidebar";
import { GetServerSideProps, GetServerSidePropsContext } from "next/types";
import { Session } from "next-auth";

export const defaultGPTProject: Project = {
  id: "-1",
  name: "Default GPT",
  display_name: "Default GPT",
  source: "",
  index_list: [],
};

// Set the path of the pages here that should be rendered with a sidebar
const PAGE_PATHS_WITH_SIDEBAR = ["/chat", "/manageData", "/settings"];

export default function App({
  Component,
  pageProps,
  router,
}: AppProps & { session: Session }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Array<Project>>([defaultGPTProject]);
  const [dataSyncs, setDataSyncs] = useState<DataSyncs>({
    github: false,
  });
  const [errors, setErrors] = useState<Array<{ message: string }>>([]);
  const [refresh, setRefresh] = useState(false);

  let componentToRender;

  if (PAGE_PATHS_WITH_SIDEBAR.includes(router.pathname)) {
    componentToRender = (
      <PageWithSidebar>
        <Component {...pageProps} />
      </PageWithSidebar>
    );
  } else {
    componentToRender = <Component {...pageProps} />;
  }

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
          refreshDep: refresh,
          forceRefresh: () => setRefresh((prev) => !prev),
          errors,
          setErrors,
        }}
      >
        {componentToRender}
      </BaselineContext.Provider>
    </SessionProvider>
  );
}
