import { Request, Response } from "express";
import {
  createEmbeddingFromRepositoryRequest,
  deleteEmbeddingFromRepositoryRequest,
} from "@baselinedocs/shared";
import { fork } from "child_process";
import { supabase } from "../lib/supabase.js";
import { downloadRepository } from "../lib/github.js";
import { deleteIndex, startIngestion } from "../lib/indexes.js";
import fs from "fs";
import * as dotenv from "dotenv";
import _ from "lodash";

dotenv.config();

interface DataSyncAccessTokenFromRepositoryModel {
  access_token_data: {
    access_token: string;
  };
  repos: RepositoryModel[];
}

interface RepositoryModel {
  repo_name: string;
  repo_owner: string;
}

export async function createIndexFromRepository(
  req: Request<{}, {}, createEmbeddingFromRepositoryRequest>,
  res: Response
) {
  const { repo_id, repo_name } = req.body;

  if (repo_id === undefined || repo_name === undefined) {
    req.log.info(`Request missing required keys`);
    return res.sendStatus(400);
  }

  const indexName = _.snakeCase(`${repo_name}-${repo_id}`.toLowerCase());

  const createIndexResponse = await _createIndex(indexName, repo_id);

  if (createIndexResponse.error || !createIndexResponse.data) {
    console.error(createIndexResponse.error);
    return res.sendStatus(500);
  }

  res.status(200).json({
    message: "Successfully created index entry",
    embedding_id: createIndexResponse.data.embedding_index_id,
  });

  const { data, error } = await supabase
    .from("data_syncs")
    .select("access_token_data, repos!inner(repo_name, repo_owner)")
    .eq("repos.repo_id", repo_id)
    .maybeSingle();

  if (error || !data) {
    console.error(error);
    throw error;
  }

  const validatedData = data as DataSyncAccessTokenFromRepositoryModel;
  let filepath: string;
  try {
    filepath = await downloadRepository(
      validatedData.access_token_data.access_token,
      validatedData.repos[0],
      req.log
    );
  } catch (error) {
    console.error(error);
    throw "Error downloading repository";
  }

  // TODO: Create child
  // Launch child process
  req.log.info("Launching Child process to ingest repository");
  try {
    await startIngestion(filepath, indexName, req.log);
    // Ingestion is done update DB entry
    await supabase
      .from("embedding_indexes")
      .update({ ready: true })
      .eq("embedding_index_id", createIndexResponse.data.embedding_index_id);

    fs.rmSync(filepath, { recursive: true });
    req.log.info(`${filepath} deleted successfully`);
  } catch (error) {
    // TODO: If any part fails we should reset the DB so the user can try again, or we should try to be ATOMIC and not save unless everything is successfull
    // TODO: This process might be flaky too so we should revert to beginning and retry, Also might want to find a way to deal with server restarts

    console.error(error);
  }
}

export async function deleteIndexForRepository(
  req: Request<{}, {}, deleteEmbeddingFromRepositoryRequest>,
  res: Response
) {
  const { repo_id } = req.body;

  if (repo_id === undefined) {
    req.log.info(`Request missing required keys`);
    return res.sendStatus(400);
  }

  const embeddingIndexInfo = await supabase
    .from("embedding_indexes")
    .select("index_name")
    .eq("repo_id", repo_id);

  if (embeddingIndexInfo.error || !embeddingIndexInfo.data) {
    console.error(embeddingIndexInfo.error);
    return res.status(500).send();
  }

  // Delete index
  embeddingIndexInfo.data.forEach((index) => {
    deleteIndex(index.index_name, req.log);
  });

  // Delete database record
  const embeddingIndexDelete = await supabase
    .from("embedding_indexes")
    .delete()
    .eq("repo_id", repo_id);

  if (embeddingIndexDelete.error) {
    console.error(embeddingIndexDelete.error);
    return res.status(500).send();
  }

  res.status(200).json({
    message: `Indexes for repo: ${repo_id} deleted successfully`,
  });
}

async function _createIndex(index_name: string, repo_id: string) {
  const { data, error } = await supabase
    .from("embedding_indexes")
    .insert({
      index_name: index_name,
      index_source: "supabase",
      repo_id: repo_id,
    })
    .select()
    .maybeSingle();

  if (error || !data) {
    return {
      data: null,
      error,
    };
  }
  return { data: data as { embedding_index_id: string }, error };
}
