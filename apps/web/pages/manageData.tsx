import { SyncWithGithubButton } from "@/components/syncWithGithub";
import { BaselineContext } from "@/context/baselineContext";
import { Menu } from "@headlessui/react";
import { useContext, useLayoutEffect, useState } from "react";
import { RiCheckFill, RiMoreFill, RiCloseFill } from "react-icons/ri";
import { BarLoader } from "react-spinners";
import { PageWithSidebar } from "@/components/layouts/pageWithSidebar";

const DataStatuses = {
  llmReady: (
    <>
      LLM Ready <RiCheckFill className="h-6 w-6 text-green-500" />
    </>
  ),
  llmTrainingInProgress: (
    <>
      <div className="flex flex-col justify-center">
        Getting LLM ready <BarLoader width="100%" color="#36d7b7" />
      </div>
    </>
  ),
  llmNotTrained: (
    <>
      Baseline not created on repository
      <RiCloseFill className="h-6 w-6 text-red-500" />
    </>
  ),
};

export default function ManageData() {
  const { demoStage, setDemoStage } = useContext(BaselineContext);
  const [projects, setProjects] = useState<Array<any>>([]);

  const ProjectDataTable = ({
    projects,
  }: {
    projects: Array<{ name: string; source: string; status: JSX.Element }>;
  }) => {
    return (
      <div className="w-full flex-grow rounded-lg border-2 border-slate-200 shadow-lg">
        <table className="text w-full text-left">
          <thead className="bg-slate-200">
            <tr>
              <th scope="col" className="px-6 py-3">
                Project
              </th>
              <th scope="col" className="px-6 py-3">
                Source
              </th>
              <th scope="col" className="px-6 py-3">
                Status
              </th>
              <th scope="col" className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {projects.length === 0 && (
              <tr className="border-b bg-white">
                <th
                  scope="row"
                  className="whitespace-nowrap px-6 py-4 font-medium"
                >
                  No projects found. Sync a data source to get started!
                </th>
                <td className="px-6 py-4"></td>
                <td className="flex items-center gap-2 px-6 py-4"></td>
                <td className="px-6 py-4"></td>
              </tr>
            )}
            {projects.map((project, index) => {
              return (
                <tr key={`data_row_${index}`} className="border-b bg-white">
                  <th
                    scope="row"
                    className="whitespace-nowrap px-6 py-4 font-medium"
                  >
                    {project.name}
                  </th>
                  <td className="px-6 py-4">{project.source}</td>
                  <td className="flex items-center gap-2 px-6 py-4">
                    {project.status}
                  </td>
                  <td className="px-6 py-4">
                    <Menu>
                      <Menu.Button className="relative rounded-full p-1 hover:bg-slate-200">
                        <RiMoreFill className="h-6 w-6" />
                      </Menu.Button>
                      <Menu.Items className="absolute z-50 rounded-md border border-slate-200 bg-white p-2 text-sm">
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              className={`hover:text-indigo-600`}
                              onClick={() => {
                                setDemoStage(2);
                                setTimeout(() => {
                                  setDemoStage(3);
                                }, 5000);
                              }}
                            >
                              Create Baseline
                            </button>
                          )}
                        </Menu.Item>
                      </Menu.Items>
                    </Menu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  useLayoutEffect(() => {
    if (demoStage === 1) {
      setProjects([
        {
          name: "Jira-demo-clone",
          source: "Github",
          status: DataStatuses.llmNotTrained,
        },
        {
          name: "Netflix-clone",
          source: "Github",
          status: DataStatuses.llmNotTrained,
        },
        {
          name: "Todo-list",
          source: "Github",
          status: DataStatuses.llmNotTrained,
        },
      ]);
    } else if (demoStage === 2) {
      setProjects([
        {
          name: "Jira-demo-clone",
          source: "Github",
          status: DataStatuses.llmTrainingInProgress,
        },
        {
          name: "Netflix-clone",
          source: "Github",
          status: DataStatuses.llmNotTrained,
        },
        {
          name: "Todo-list",
          source: "Github",
          status: DataStatuses.llmNotTrained,
        },
      ]);
    } else if (demoStage === 3) {
      setProjects([
        {
          name: "Jira-demo-clone",
          source: "Github",
          status: DataStatuses.llmReady,
        },
        {
          name: "Netflix-clone",
          source: "Github",
          status: DataStatuses.llmNotTrained,
        },
        {
          name: "Todo-list",
          source: "Github",
          status: DataStatuses.llmNotTrained,
        },
      ]);
    }
  }, [demoStage]);

  return (
    <PageWithSidebar>
      <div className="mt-20 flex w-full flex-col items-center justify-center gap-8">
        <h1 className="text-4xl font-bold">Manage Data Syncs</h1>
        <div className="w-full max-w-6xl px-10">
          <ProjectDataTable projects={projects} />
        </div>
        <SyncWithGithubButton
          syncComplete={demoStage !== 0}
          onClick={() => {
            setTimeout(() => {
              setDemoStage(1);
            }, 250);
          }}
        />
      </div>
    </PageWithSidebar>
  );
}
