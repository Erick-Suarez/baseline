import { useState, useContext } from 'react';
import { Listbox } from '@headlessui/react';
import { BaselineContext } from '@context/baselineContext';
const projects = [
  {
    id: 1,
    name: 'Jira-demo-clone',
  },
  {
    id: 0,
    name: 'Select a project',
  },
];

export const ProjectSelectDropbox = () => {
  const { currentProject, setCurrentProject } = useContext(BaselineContext);

  return (
    <Listbox
      value={currentProject}
      onChange={(value) => {
        setCurrentProject(value);
      }}
    >
      <Listbox.Button className="relative w-full cursor-default rounded-md border border-slate-300 bg-white py-2 pl-3 pr-10 text-left focus:outline-none">
        {currentProject}
      </Listbox.Button>
      <Listbox.Options className="absolute z-50 w-[300px] rounded-md border-2 bg-white py-2">
        {projects.map((project) => (
          <Listbox.Option
            className="w-full p-2 hover:cursor-pointer hover:bg-indigo-100 hover:text-indigo-600"
            key={project.id}
            value={project.name}
          >
            <div className="0">{project.name}</div>
          </Listbox.Option>
        ))}
      </Listbox.Options>
    </Listbox>
  );
};
