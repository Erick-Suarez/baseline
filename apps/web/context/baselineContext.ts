import { createContext } from "react";

export const BaselineContext = createContext<{
  currentProject: string | null;
  setCurrentProject: React.Dispatch<React.SetStateAction<string | null>>;
}>({
  currentProject: null,
  setCurrentProject: () => {},
});
