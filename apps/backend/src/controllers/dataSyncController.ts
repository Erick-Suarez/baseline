import { Request, Response } from "express";
import { authGithub, getRepositories } from "../lib/github.js";
import {
  DATA_SYNC_SOURCES,
  deleteDataSyncRequest,
  getDataSyncsForOrganizationRequest,
  getDataSyncsForOrganizationResponse,
} from "@baselinedocs/shared";
import { supabase } from "../lib/supabase.js";
import { deleteIndex } from "../lib/indexes.js";
import * as dotenv from "dotenv";

dotenv.config();

// Sync Github Repositories to the Database by organization_id
// Returns object with error value set to null on succes
export async function createGithubDataSyncForOrganization(
  organization_id: number,
  callback_code: string
) {
  // The req.query object has the query params that were sent to this route.
  const access_data = await authGithub(callback_code);

  const repositories = await getRepositories(access_data.access_token);

  // Save datasync
  const { data, error } = await supabase
    .from("data_syncs")
    .insert({
      source: "github",
      access_token_data: access_data,
      organization_id,
    })
    .select();

  if (error) {
    throw error;
  }

  const data_sync_id = data![0].data_sync_id;

  // Save repositories
  for await (const repository of repositories) {
    const { error } = await supabase.from("repos").insert({
      repo_name: repository.name,
      full_name: repository.full_name,
      repo_owner: repository.owner.login,
      data_sync_id,
    });

    if (error) {
      throw error;
    }
  }
}

export async function getDataSyncsForOrganization(
  req: Request<getDataSyncsForOrganizationRequest, {}, {}>,
  res: Response
) {
  const { organization_id } = req.params;

  if (organization_id === undefined) {
    console.log(`Request missing required keys`);
    return res.sendStatus(400);
  }

  const { data, error } = await supabase
    .from("data_syncs")
    .select("source")
    .eq("organization_id", organization_id);

  if (error || !data) {
    console.error(error);
    return res.status(500).send();
  }

  /* Insert other data sources here as we add support for them */
  const syncedSources: getDataSyncsForOrganizationResponse = {
    github: false,
  };

  data.forEach((data_sync) => {
    switch (data_sync.source as string) {
      case DATA_SYNC_SOURCES.GITHUB:
        syncedSources.github = true;
        break;
      default:
        break;
    }
  });

  res.status(200).json(syncedSources);
}

export async function deleteDataSync(
  req: Request<{}, {}, deleteDataSyncRequest>,
  res: Response
) {
  // Delete Datasync for organization
  // First find all indexes for organization and delete them then delete the data syncs

  const { organization_id, source } = req.body;

  if (organization_id === undefined || source === undefined) {
    console.log(`Request missing required keys`);
    return res.sendStatus(400);
  }

  const reposFromOrganizationRequest = await supabase
    .from("repos")
    .select(
      "repo_id, embedding_indexes(index_name), data_syncs!inner(data_sync_id)"
    )
    .eq("data_syncs.organization_id", organization_id);

  if (
    reposFromOrganizationRequest.error ||
    !reposFromOrganizationRequest.data
  ) {
    console.error(reposFromOrganizationRequest.error);
    return res.status(500).send();
  }

  const validatedData = reposFromOrganizationRequest.data as unknown as {
    embedding_indexes: { index_name: string }[];
  }[];

  validatedData.forEach((repo) => {
    repo.embedding_indexes.forEach((index) => {
      deleteIndex(index.index_name);
    });
  });

  const { error } = await supabase
    .from("data_syncs")
    .delete()
    .eq("source", source)
    .eq("organization_id", organization_id);

  if (error) {
    console.error(error);
    return res.status(500).send();
  }

  // redirect the user back to the manageData page
  res.status(200).json({
    message: `Successfully deleted '${req.body.source}' data sync for ${req.body.organization_id}`,
  });
}
