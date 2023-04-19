import { useState, useContext } from "react";
import { Listbox } from "@headlessui/react";
import { BaselineContext } from "@/context/baselineContext";
import { useSession } from "next-auth/react";
import { RiArrowDropDownLine } from "react-icons/ri";

export const ProjectSelectDropbox = () => {
  const { currentProject, setCurrentProject, projects } =
    useContext(BaselineContext);

  const projectsWithEmbeddings = projects.filter((project) => {
    return project.index_list.length > 0 && project.index_list[0].ready;
  });

  return (
    <Listbox
      value={currentProject}
      onChange={(value) => {
        console.log("changing");
        setCurrentProject(value);
      }}
    >
      <Listbox.Button className=" relative flex w-full cursor-default items-center justify-between rounded-md border border-slate-300 bg-white px-2 py-2 text-left focus:outline-none">
        {currentProject !== null ? currentProject.name : "Select a project"}
        <RiArrowDropDownLine className="h-6 w-6" />
      </Listbox.Button>
      <Listbox.Options className="absolute z-50 w-[270px] rounded-md border-2 bg-white py-2">
        {projectsWithEmbeddings.map((project) => (
          <Listbox.Option
            className="w-full p-2 hover:cursor-pointer hover:bg-indigo-100 hover:text-indigo-600"
            key={project.id}
            value={project}
          >
            <div className="0">{project.name}</div>
          </Listbox.Option>
        ))}
        {projectsWithEmbeddings.length === 0 && (
          <Listbox.Option
            className="pointer-events-none w-full px-2 text-sm"
            value={null}
          >
            <div className="0">
              No projects available, Create a Baseline on a repository
            </div>
          </Listbox.Option>
        )}
      </Listbox.Options>
    </Listbox>
  );
};
