import { Request, Response } from "express";
import { authenticate, getRepositories } from "../lib/providers/index.js";
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

// Sync Repositories to the Database by organization_id
// Returns object with error value set to null on succes
export async function createDataSyncForOrganization(
  organization_id: number,
  callback_code: string,
  provider: string
) {
  // The req.query object has the query params that were sent to this route.
  const access_data = await authenticate(provider, callback_code);

  const repositories = await getRepositories(
    provider,
    access_data.access_token
  );

  // Save datasync
  const { data, error } = await supabase
    .from("data_syncs")
    .insert({
      source: provider,
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
      provider_repo_id: repository.id,
      repo_name: repository.name,
      full_name: repository.full_name,
      repo_owner: repository.owner,
      default_branch: repository.default_branch,
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
    req.log.info(`Request missing required keys`);
    return res.sendStatus(400);
  }

  const { data, error } = await supabase
    .from("data_syncs")
    .select("source")
    .eq("organization_id", organization_id);

  if (error || !data) {
    req.log.error(error);
    return res.status(500).send();
  }

  /* Insert other data sources here as we add support for them */
  const syncedSources: getDataSyncsForOrganizationResponse = {
    github: false,
    gitlab: false,
  };

  data.forEach((data_sync) => {
    switch (data_sync.source as string) {
      case DATA_SYNC_SOURCES.GITHUB:
        syncedSources.github = true;
        break;
      case DATA_SYNC_SOURCES.GITLAB:
        syncedSources.gitlab = true;
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
    req.log.info(`Request missing required keys`);
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
    req.log.error(reposFromOrganizationRequest.error);
    return res.status(500).send();
  }

  const validatedData = reposFromOrganizationRequest.data as unknown as {
    embedding_indexes: { index_name: string }[];
  }[];

  validatedData.forEach((repo) => {
    repo.embedding_indexes.forEach((index) => {
      deleteIndex(index.index_name, req.log);
    });
  });

  const { error } = await supabase
    .from("data_syncs")
    .delete()
    .eq("source", source)
    .eq("organization_id", organization_id);

  if (error) {
    req.log.error(error);
    return res.status(500).send();
  }

  // redirect the user back to the manageData page
  res.status(200).json({
    message: `Successfully deleted '${req.body.source}' data sync for ${req.body.organization_id}`,
  });
}
