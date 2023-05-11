import { useContext, useState, useMemo } from "react";
import { BaselineContext } from "@/context/baselineContext";
import {
  createEmbeddingFromRepositoryRequest,
  EmbeddingIndex,
  Project,
} from "@baselinedocs/shared";
import { Disclosure, Menu } from "@headlessui/react";
import { RiCheckFill, RiCloseFill, RiMoreFill, RiArrowDownLine, RiArrowUpLine } from "react-icons/ri";
import { BarLoader } from "react-spinners";
import { parseCookies } from "nookies";

export const ProjectDataTable = ({
  projects,
  showErrorMessage,
}: {
  projects: Array<Project>;
  showErrorMessage?: boolean;
}) => {
  if (showErrorMessage) {
    projects = [];
  }
  const [ projectsSortDirectionAsc, setProjectsSortDirectionAsc ] = useState(true);
  const sortedProjects = useMemo(() => {
    let sortableItems = [...projects.filter((project) => project.id != "-1")];
    sortableItems.sort((project1, project2) => {
      const project1_status_type = _getStatusOfProject(project1).type;
      const project2_status_type = _getStatusOfProject(project2).type;

      if (project1_status_type === ProjectBaselineStatus.READY && project2_status_type !== ProjectBaselineStatus.READY) {
        return -1; // project1 is ready, so it should come before project2
      } else if (project1_status_type !== ProjectBaselineStatus.READY && project2_status_type === ProjectBaselineStatus.READY) {
        return 1; // project2 is ready, so it should come before project1
      } else if (project1_status_type === ProjectBaselineStatus.IN_PROGRESS && project2_status_type === ProjectBaselineStatus.NOT_CREATED) {
        return -1; // project1 is in progress, so it should come before project2
      } else if (project1_status_type === ProjectBaselineStatus.NOT_CREATED && project2_status_type === ProjectBaselineStatus.IN_PROGRESS) {
        return 1; // project2 is in progress, so it should come before project1
      } else {
        if (projectsSortDirectionAsc) {
          return project1.display_name.localeCompare(project2.display_name);
        } else {
          return project2.display_name.localeCompare(project1.display_name);
        }
      }
    });
    return sortableItems;
  }, [projects, projectsSortDirectionAsc]);
  const { forceRefresh } = useContext(BaselineContext);
  const defaultInclude = ["**/*.js", "**/*.jsx", "**/*.ts", "**/*.tsx", "**/*.py", "**/*.html", "**/*.css"];
  const defaultExclude = ["**/.git/**", "**/.vscode/**", "**/node_modules/**", "**/dist/**"];
  return (
    <div className="max-h-[65vh] w-full flex-grow overflow-y-auto rounded-lg border-2 border-slate-200 pb-5 shadow-lg">
      <table className="text w-full text-left">
        <thead className="sticky top-0 z-50 bg-slate-200 shadow">
          <tr>
            <th scope="col" className="px-6 py-3 shadow">
              <button type ="button" onClick={() => setProjectsSortDirectionAsc(!projectsSortDirectionAsc)} style={{ display: 'inline-flex' }}>
                Projects({sortedProjects.length}) {' '} {projectsSortDirectionAsc ? <RiArrowUpLine className="h-6 w-6 text-gray-500"/> : <RiArrowDownLine className="h-6 w-6 text-gray-500"/>}
              </button>
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
          {sortedProjects.length === 0 && (
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
          {sortedProjects.map((project, index) => {
            const { type, data: projectStatus } = _getStatusOfProject(project);
            return (
              <tr key={`data_row_${index}`} className="border-b bg-white">
                <th
                  scope="row"
                  className="whitespace-nowrap px-6 py-4 font-medium"
                >
                  {project.display_name}
                </th>
                <td className="px-6 py-4 capitalize">{project.source}</td>
                <td className="flex items-center gap-2 px-6 py-4">
                  {projectStatus}
                </td>
                <td className="relative bg-white px-6 py-4">
                  <Menu>
                    <Menu.Button className="rounded-full p-1 hover:bg-slate-200">
                      <RiMoreFill className="h-6 w-6" />
                    </Menu.Button>
                    <Menu.Items className="absolute left-[10] right-[25px] z-10 w-[128px] rounded-md border border-slate-200 bg-white p-2 text-sm">
                      <Menu.Item>
                        {({ close }) => {
                          if (type === ProjectBaselineStatus.NOT_CREATED) {
                            return (
                              <button
                                className={`hover:text-indigo-600`}
                                onClick={(event) => {
                                  const payload: createEmbeddingFromRepositoryRequest =
                                    {
                                      repo_id: project.id,
                                      repo_name: project.name,
                                      include: defaultInclude,
                                      exclude: defaultExclude,
                                    };

                                  fetch(
                                    `${process.env.NEXT_PUBLIC_BASELINE_BACKEND_URL}/baseline`,
                                    {
                                      method: "POST",
                                      headers: {
                                        "Content-Type": "application/json",
                                        Authorization: `BEARER ${
                                          parseCookies()[
                                            "baseline.access-token"
                                          ]
                                        }`,
                                      },
                                      body: JSON.stringify(payload),
                                    }
                                  )
                                    .then((res) => res.json())
                                    .then((data) => {
                                      forceRefresh();
                                    })
                                    .catch((err) => {
                                      /* TODO: Handle Error */
                                    });
                                }}
                              >
                                Create Baseline
                              </button>
                            );
                          } else {
                            return (
                              <button
                                onClick={() => {
                                  fetch(
                                    `${process.env.NEXT_PUBLIC_BASELINE_BACKEND_URL}/baseline`,
                                    {
                                      method: "DELETE",
                                      headers: {
                                        "Content-Type": "application/json",
                                        Authorization: `BEARER ${
                                          parseCookies()[
                                            "baseline.access-token"
                                          ]
                                        }`,
                                      },
                                      body: JSON.stringify({
                                        repo_id: project.id,
                                      }),
                                    }
                                  )
                                    .then((res) => res.json())
                                    .then((data) => {
                                      forceRefresh();
                                    })
                                    .catch((err) => {
                                      /* TODO: Handle Error */
                                    });
                                }}
                                className={`hover:text-indigo-600`}
                              >
                                Delete Baseline
                              </button>
                            );
                          }
                        }}
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

enum ProjectBaselineStatus {
  READY,
  IN_PROGRESS,
  NOT_CREATED,
}

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

// TODO: Refactor so DataStatuses and interface are not coupled
function _getStatusOfProject(project: Project) {
  if (project.index_list.length === 0) {
    return {
      type: ProjectBaselineStatus.NOT_CREATED,
      data: DataStatuses.llmNotTrained,
    };
  }

  if (!project.index_list[0].ready) {
    return {
      type: ProjectBaselineStatus.IN_PROGRESS,
      data: DataStatuses.llmTrainingInProgress,
    };
  }

  return { type: ProjectBaselineStatus.READY, data: DataStatuses.llmReady };
}
