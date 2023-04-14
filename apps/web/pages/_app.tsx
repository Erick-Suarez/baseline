import { BaselineContext } from "@/context/baselineContext";
import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { useState } from "react";
import { SessionProvider } from "next-auth/react";

export default function App({ Component, pageProps }: AppProps) {
  const [currentProject, setCurrentProject] = useState<string | null>(
    "Select a project"
  );
  const [demoStage, setDemoStage] = useState(0);

  return (
    <SessionProvider session={pageProps.session}>
      <BaselineContext.Provider
        value={{
          currentProject,
          setCurrentProject,
          demoStage,
          setDemoStage,
        }}
      >
        <Component {...pageProps} />
      </BaselineContext.Provider>
    </SessionProvider>
  );
}
