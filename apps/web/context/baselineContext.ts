import { Project } from "@baselinedocs/shared";
import { DataSyncs } from "@/types/project";
import { createContext } from "react";

export const BaselineContext = createContext<{
  currentProject: Project | null;
  setCurrentProject: React.Dispatch<React.SetStateAction<Project | null>>;
  projects: Array<Project>;
  setProjects: React.Dispatch<React.SetStateAction<Array<Project>>>;
  dataSyncs: DataSyncs;
  setDataSyncs: React.Dispatch<React.SetStateAction<DataSyncs>>;
  refreshDep: boolean; // Dependency other pages will need to subscribe to if forceRefresh() should also refresh that page
  forceRefresh: () => void;
  errors: Array<{ message: string }>;
  setErrors: React.Dispatch<
    React.SetStateAction<
      Array<{
        message: string;
      }>
    >
  >;
}>({
  currentProject: null,
  setCurrentProject: () => {},
  projects: [],
  setProjects: () => {},
  dataSyncs: { github: false },
  setDataSyncs: () => {},
  refreshDep: false,
  forceRefresh: () => {},
  errors: [],
  setErrors: () => {},
});
