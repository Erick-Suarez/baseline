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
  forceRefresh: () => void;
}>({
  currentProject: null,
  setCurrentProject: () => {},
  projects: [],
  setProjects: () => {},
  dataSyncs: { github: false },
  setDataSyncs: () => {},
  forceRefresh: () => {},
});
