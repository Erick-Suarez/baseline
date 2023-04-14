import { EmbeddingIndex } from "@/pages/manageData";
import { Disclosure, Menu } from "@headlessui/react";
import { useState } from "react";
import { RiCheckFill, RiCloseFill, RiMoreFill } from "react-icons/ri";
import { BarLoader } from "react-spinners";

export interface Project {
  name: string;
  source: string;
  index_list: Array<EmbeddingIndex>;
}

export const ProjectDataTable = ({
  projects,
  showErrorMessage,
}: {
  projects: Array<Project>;
  showErrorMessage?: boolean;
}) => {
  return (
    <div className="max-h-[65vh] w-full flex-grow overflow-y-auto rounded-lg border-2 border-slate-200 shadow-lg">
      <table className="text w-full text-left">
        <thead className="sticky top-0 z-50 bg-slate-200 shadow">
          <tr>
            <th scope="col" className="px-6 py-3 shadow">
              Projects({projects.length})
            </th>
            <th scope="col" className="px-6 py-3 shadow">
              Source
            </th>
            <th scope="col" className="px-6 py-3 shadow">
              Status
            </th>
            <th scope="col" className="px-6 py-3 shadow"></th>
          </tr>
        </thead>
        <tbody>
          {projects.length === 0 && (
            <tr className="border-b bg-white">
              <th
                scope="row"
                className="whitespace-nowrap px-6 py-4 font-medium"
              >
                {showErrorMessage ? (
                  <p className="p-2 text-lg font-bold text-red-400">
                    There was a problem connecting with the server
                  </p>
                ) : (
                  <p className="p-2 text-lg font-bold">
                    No projects found. Sync a data source to get started!
                  </p>
                )}
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
                <td className="px-6 py-4 capitalize">{project.source}</td>
                <td className="flex items-center gap-2 px-6 py-4">
                  {_getStatusOfProject(project)}
                </td>
                <td className="relative bg-white px-6 py-4">
                  <Menu>
                    <Menu.Button className="rounded-full p-1 hover:bg-slate-200">
                      <RiMoreFill className="h-6 w-6" />
                    </Menu.Button>
                    <Menu.Items className="absolute left-[10] right-[25px] z-10 w-[128px] rounded-md border border-slate-200 bg-white p-2 text-sm">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            className={`hover:text-indigo-600`}
                            onClick={() => {}}
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

export const DataStatuses = {
  llmReady: (
    <>
      Baseline Ready <RiCheckFill className="h-6 w-6 text-green-500" />
    </>
  ),
  llmTrainingInProgress: (
    <>
      <div className="flex flex-col justify-center">
        Creating Baseline from Repository{" "}
        <BarLoader width="100%" color="#36d7b7" />
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

function _getStatusOfProject(project: Project) {
  if (project.index_list.length === 0) {
    return DataStatuses.llmNotTrained;
  }

  return DataStatuses.llmReady;
}
