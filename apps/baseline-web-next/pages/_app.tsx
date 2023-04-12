import { BaselineContext } from "@/context/baselineContext";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useState } from "react";

export default function App({ Component, pageProps }: AppProps) {
  const [currentProject, setCurrentProject] = useState<string | null>(
    "Select a project"
  );
  const [demoStage, setDemoStage] = useState(0);
  return (
    <BaselineContext.Provider
      value={{ currentProject, setCurrentProject, demoStage, setDemoStage }}
    >
      <Component {...pageProps} />
    </BaselineContext.Provider>
  );
}
