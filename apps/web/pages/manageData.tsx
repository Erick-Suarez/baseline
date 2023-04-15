import { Project, ProjectDataTable } from "@/components/dataSyncTable";
import { PageWithSidebar } from "@/components/layouts/pageWithSidebar";
import { SyncWithGithubButton } from "@/components/syncWithGithub";
import { supabase } from "@/utils/supabase";
import { GetServerSideProps } from "next";
import { useState } from "react";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getServerSession } from "next-auth/next";

export default function ManageDataPage({
  syncedSources: initialSyncedSources,
  projects: initialProjects,
  errorDuringFetching,
  organization_id,
}: {
  syncedSources: { github: boolean };
  projects: Array<Project>;
  errorDuringFetching: boolean;
  organization_id: number;
}) {
  const [syncedSources, setSyncedSources] = useState(initialSyncedSources);
  const [projects, setProjects] = useState(initialProjects);

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
          />
        )}
      </div>
    </PageWithSidebar>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = await getServerSession(context.req, context.res, authOptions);
  const fetchProjectsResponse = await _fetchProjects(
    session.user.organization.organization_id
  );

  const getSyncedSourcesResponse = await _getSyncedSources(
    session.user.organization.organization_id
  );

  return {
    props: {
      organization_id: session.user.organization.organization_id,
      syncedSources: getSyncedSourcesResponse.data,
      projects: fetchProjectsResponse.data,
      errorDuringFetching:
        fetchProjectsResponse.error !== null ||
        getSyncedSourcesResponse.error !== null,
    },
  };
};

enum DATA_SYNC_SOURCES {
  GITHUB = "github",
}

interface SupabaseQueryResponse {
  repo_name: string;
  data_syncs: { source: string };
  embedding_indexes: Array<EmbeddingIndex>;
}

export interface EmbeddingIndex {
  index_name: string;
  updated_at: Date;
  commit_sha: string;
}

async function _fetchProjects(organization_id: number) {
  const { data, error } = await supabase
    .from("repos")
    .select(
      "repo_name, data_syncs!inner(source), embedding_indexes(index_name, updated_at, last_repo_commit->commit_sha)"
    )
    .eq("data_syncs.organization_id", organization_id);

  if (error) {
    return {
      data: null,
      error,
    };
  }

  return {
    data: _parseSupabaseDataIntoProjects(data as Array<SupabaseQueryResponse>),
    error: null,
  };
}

function _parseSupabaseDataIntoProjects(
  data: Array<SupabaseQueryResponse>
): Array<Project> {
  const projects: Array<Project> = [];

  data.forEach((repo) => {
    projects.push({
      name: repo.repo_name,
      source: repo.data_syncs.source,
      index_list: repo.embedding_indexes,
    });
  });

  return projects;
}

async function _getSyncedSources(organization_id: number) {
  const { data, error } = await supabase
    .from("data_syncs")
    .select("source")
    .eq("organization_id", organization_id);

  if (error) {
    console.error(error);
    return {
      data: null,
      error,
    };
  }

  const syncedSources = { github: false };

  data.forEach((data_sync) => {
    switch (data_sync.source as string) {
      case DATA_SYNC_SOURCES.GITHUB:
        syncedSources.github = true;
        break;
      default:
        break;
    }
  });

  return {
    data: syncedSources,
    error: null,
  };
}
