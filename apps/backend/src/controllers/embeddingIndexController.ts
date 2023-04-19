import express, { Express, Request, Response } from "express";
import * as dotenv from "dotenv";
import {
  createEmbeddingFromRepositoryRequest,
  deleteEmbeddingFromRepositoryRequest,
} from "@baselinedocs/shared";
import { fork } from "child_process";
import { supabase } from "../lib/supabase.js";
import { downloadRepository } from "../lib/github.js";
import chalk from "chalk";
import { deleteIndex, startIngestion } from "../lib/pinecone.js";
import fs from "fs";

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
  const request = req.body;

  const indexName = `${request.repo_id}`.toLowerCase();

  const createIndexResponse = await _createIndex(indexName, request.repo_id);

  if (createIndexResponse.error || !createIndexResponse.data) {
    console.error(createIndexResponse.error);
    return res.status(500).send();
  }

  res.status(200).json({
    message: "Successfully created index entry",
    embedding_id: createIndexResponse.data.embedding_index_id,
  });

  const { data, error } = await supabase
    .from("data_syncs")
    .select("access_token_data, repos!inner(repo_name, repo_owner)")
    .eq("repos.repo_id", request.repo_id)
    .maybeSingle();

  if (error || !data) {
    console.error(error);
  }

  const validatedData = data as DataSyncAccessTokenFromRepositoryModel;
  let filepath: string;
  try {
    filepath = await downloadRepository(
      validatedData.access_token_data.access_token,
      validatedData.repos[0]
    );
  } catch (error) {
    console.error(error);
    throw "Error downloading repository";
  }

  // TODO: Create child
  // Launch child process
  console.log("Launching Child process to ingest repository");
  try {
    await startIngestion(filepath, indexName);
    // Ingestion is done update DB entry
    await supabase
      .from("embedding_indexes")
      .update({ ready: true })
      .eq("embedding_index_id", createIndexResponse.data.embedding_index_id);

    fs.rmSync(filepath, { recursive: true });
    console.log(`${filepath} deleted successfully`);
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
  const request = req.body;
  const embeddingIndexInfo = await supabase
    .from("embedding_indexes")
    .select("index_name")
    .eq("repo_id", request.repo_id);

  if (embeddingIndexInfo.error || !embeddingIndexInfo.data) {
    console.error(embeddingIndexInfo.error);
    return res.status(500).send();
  }

  // Delete Pinecone index
  embeddingIndexInfo.data.forEach((index) => {
    deleteIndex(index.index_name);
  });

  // Delete database record
  const embeddingIndexDelete = await supabase
    .from("embedding_indexes")
    .delete()
    .eq("repo_id", request.repo_id);

  if (embeddingIndexDelete.error) {
    console.error(embeddingIndexDelete.error);
    return res.status(500).send();
  }

  res.status(200).json({
    message: `Indexes for repo: ${request.repo_id} deleted successfully`,
  });
}

async function _createIndex(index_name: string, repo_id: string) {
  const { data, error } = await supabase
    .from("embedding_indexes")
    .insert({
      index_name: index_name,
      index_source: "pinecone",
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
