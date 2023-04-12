import { createContext } from 'react';

export const BaselineContext = createContext<{
  currentProject: string | null;
  setCurrentProject: React.Dispatch<React.SetStateAction<string | null>>;
  demoStage: number;
  setDemoStage: React.Dispatch<React.SetStateAction<number>>;
}>({
  currentProject: null,
  setCurrentProject: () => {},
  demoStage: 0,
  setDemoStage: () => {},
});
