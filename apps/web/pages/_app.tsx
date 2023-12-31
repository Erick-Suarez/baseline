import { BaselineContext } from "@/context/baselineContext";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useEffect, useState } from "react";
import { SessionProvider } from "next-auth/react";
import { DataSyncs } from "@/types/project";
import { Project } from "@baselinedocs/shared";
import { PageWithSidebar } from "@/components/layouts/pageWithSidebar";
import { Session } from "next-auth";
import { GoogleAnalytics } from "nextjs-google-analytics";
import { Alert } from "@/components/alerts";

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
    gitlab: false,
  });
  const [errors, setErrors] = useState<Array<Alert>>([]);
  const [refresh, setRefresh] = useState(false);

  useEffect(() => {
    const savedContext = localStorage.getItem("baseline.context");
    if (savedContext) {
      const parsedContext = JSON.parse(savedContext);
      setCurrentProject(parsedContext.currentProject);
    }
  }, []);

  useEffect(() => {
    if (currentProject) {
      localStorage.setItem(
        "baseline.context",
        JSON.stringify({
          currentProject,
        })
      );
    }
  }, [currentProject]);

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
        <GoogleAnalytics trackPageViews />
      </BaselineContext.Provider>
    </SessionProvider>
  );
}
