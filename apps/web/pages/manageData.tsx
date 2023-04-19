import { ProjectDataTable } from "@/components/dataSyncTable";
import { PageWithSidebar } from "@/components/layouts/pageWithSidebar";
import { SyncWithGithubButton } from "@/components/syncWithGithub";
import { useContext, useEffect, useState } from "react";
import { BaselineContext } from "@/context/baselineContext";
import { useSession } from "next-auth/react";
import { DataSyncs } from "@/types/project";

export default function ManageDataPage({}: {}) {
  const session = useSession();
  const {
    dataSyncs,
    setDataSyncs,
    projects: SyncedProjects,
  } = useContext(BaselineContext);

  if (session.data && session.status === "authenticated") {
    const organization_id = session.data.user.organization.organization_id;
    const syncedSources = dataSyncs;
    const projects = SyncedProjects;
    const errorDuringFetching = false;

    return (
      <PageWithSidebar>
        <div className="mt-20 flex w-full flex-col items-center justify-center gap-8">
          <h1 className="text-4xl font-bold">Manage Data Syncs</h1>

          <div className="w-full max-w-7xl overflow-y-auto px-10">
            <ProjectDataTable
              projects={projects}
              showErrorMessage={errorDuringFetching}
            />
          </div>
          {!errorDuringFetching && (
            <SyncWithGithubButton
              alreadySynced={syncedSources.github}
              organization_id={organization_id}
              onSync={(updatedSyncs: DataSyncs) => {
                setDataSyncs(updatedSyncs);
              }}
            />
          )}
        </div>
      </PageWithSidebar>
    );
  }
}
