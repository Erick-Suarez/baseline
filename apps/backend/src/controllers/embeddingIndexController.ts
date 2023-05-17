import { NextFunction, Request, Response } from "express";
import {
  createEmbeddingFromRepositoryRequest,
  deleteEmbeddingFromRepositoryRequest,
  updateEmbeddingFromRepositoryRequest,
  AccessTokenData,
  RepositoryModel,
} from "@baselinedocs/shared";
import { supabase, supabaseIndexes } from "../lib/supabase.js";
import {
  downloadRepository,
  getHeadSha,
  getDiff,
} from "../lib/providers/index.js";
import {
  deleteIndex,
  startIngestion,
  createFileIndexes,
} from "../lib/indexes.js";
import fs from "fs";
import * as dotenv from "dotenv";
import _ from "lodash";
import path from "path";

dotenv.config();

interface DataSyncAccessTokenFromRepositoryModel {
  access_token_data: AccessTokenData;
  repos: RepositoryModel[];
}

export async function createIndexFromRepository(
  req: Request<{}, {}, createEmbeddingFromRepositoryRequest>,
  res: Response,
  next: NextFunction
) {
  try {
    const { repo_id, repo_name, provider, include, exclude } = req.body;
    if (repo_id === undefined || repo_name === undefined) {
      req.log.info(`Request missing required keys`);
      return res.sendStatus(400);
    }
    const indexName = _.snakeCase(`${repo_name}-${repo_id}`.toLowerCase());
    const createIndexResponse = await _createIndex(indexName, repo_id);
    if (createIndexResponse.error || !createIndexResponse.data) {
      req.log.error(createIndexResponse.error);
      return res.sendStatus(500);
    }

    res.status(200).json({
      message: "Successfully created index entry",
      embedding_id: createIndexResponse.data.embedding_index_id,
    });

    const { data, error } = await supabase
      .from("data_syncs")
      .select(
        "access_token_data, repos!inner(provider_repo_id, repo_name, data_sync_id, repo_owner, default_branch)"
      )
      .eq("repos.repo_id", repo_id)
      .maybeSingle();

    if (error || !data) {
      req.log.error(error);
      throw error;
    }
    const validatedData = data as DataSyncAccessTokenFromRepositoryModel;

    const sha = await getHeadSha(
        provider,
        validatedData.access_token_data,
        validatedData.repos[0]
    );

    const filepath = await downloadRepository(
        provider,
        validatedData.access_token_data,
        validatedData.repos[0],
        sha,
        req.log
    );

    // TODO: Create child
    // Launch child process
    // TODO: If any part fails we should reset the DB so the user can try again, or we should try to be ATOMIC and not save unless everything is successfull
    // TODO: This process might be flaky too so we should revert to beginning and retry, Also might want to find a way to deal with server restarts
    req.log.info("Launching Child process to ingest repository");
    await startIngestion(filepath, indexName, req.log, include, exclude);
    // Ingestion is done update DB entry
    await supabase
      .from("embedding_indexes")
      .update({ ready: true, last_repo_commit: sha })
      .eq("embedding_index_id", createIndexResponse.data.embedding_index_id);

    fs.rmSync(filepath, { recursive: true });
    req.log.info(`${filepath} deleted successfully`);

  } catch (err) {
    return next(err);
  }
}

export async function updateIndexFromRepository(
  req: Request<{}, {}, updateEmbeddingFromRepositoryRequest>,
  res: Response,
  next: NextFunction
) {
  try {
    let { repo_id, provider, include, exclude } = req.body;
    if (repo_id === undefined) {
      req.log.info(`Request missing required keys`);
      return res.sendStatus(400);
    }

    const embeddingIndexInfo = await supabase
      .from("embedding_indexes")
      .select("last_repo_commit")
      .eq("repo_id", repo_id)
      .maybeSingle();
    if (embeddingIndexInfo.error || !embeddingIndexInfo.data) {
      console.error(embeddingIndexInfo.error);
      return res.status(500).send();
    }

    const { data, error } = await supabase
      .from("data_syncs")
      .select(
        "access_token_data, repos!inner(provider_repo_id, repo_name, data_sync_id, repo_owner, default_branch)"
      )
      .eq("repos.repo_id", repo_id)
      .maybeSingle();

    if (error || !data) {
      console.error(error);
      throw error;
    }

    const validatedData = data as DataSyncAccessTokenFromRepositoryModel;

    const head = await getHeadSha(
      provider,
      validatedData.access_token_data,
      validatedData.repos[0]
    );
    const diff = await getDiff(
      provider,
      validatedData.access_token_data,
      validatedData.repos[0],
      embeddingIndexInfo.data.last_repo_commit,
      head
    );

    console.log("Updating based on diff: ", diff);
    const indexName = _.snakeCase(
      `${validatedData.repos[0].repo_name}-${repo_id}`.toLowerCase()
    );

    if (diff.files_added.length > 0 || diff.files_modified.length > 0) {
      const filepath = await downloadRepository(
          provider,
          validatedData.access_token_data,
          validatedData.repos[0],
          head,
          req.log
        );

      diff.files_modified.forEach(async (file) => {
        await supabaseIndexes
          .from(indexName)
          .delete()
          .eq("metadata->>filename", file);
        console.log("File embedding deleted: ", file);
      });
      const files_to_add = diff.files_added.concat(diff.files_modified);
      _deleteFilesNotInList(
        files_to_add.map((filePath) => path.normalize(filePath)),
        filepath
      );

      await createFileIndexes(
        filepath,
        filepath,
        indexName,
        req.log,
        include,
        exclude
      );

      fs.rm(filepath, { recursive: true }, (err) => {
        if (err) {
          console.error(`Error deleting directory: ${err}`);
        } else {
          console.log(`Directory ${filepath} deleted successfully!`);
        }
      });
    }

    diff.files_removed.forEach(async (file) => {
      await supabaseIndexes
        .from(indexName)
        .delete()
        .eq("metadata->>filename", file);
      console.log("File embedding deleted: ", file);
    });

    await supabase
      .from("embedding_indexes")
      .update({ last_repo_commit: head })
      .eq("repo_id", repo_id)
      .maybeSingle();

    return res.status(200).json({
      message: `Indexes for repo: ${repo_id} updated successfully`,
    });
  } catch (err) {
    return next(err);
  }
}

export async function deleteIndexForRepository(
  req: Request<{}, {}, deleteEmbeddingFromRepositoryRequest>,
  res: Response,
  next: NextFunction
) {
  try {
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
      req.log.error(embeddingIndexInfo.error);
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
      req.log.error(embeddingIndexDelete.error);
      return res.status(500).send();
    }

    res.status(200).json({
      message: `Indexes for repo: ${repo_id} deleted successfully`,
    });
  } catch (err) {
    return next(err);
  }
}

function _deleteFilesNotInList(
  fileList: string[],
  directoryPath: string,
  baseDirectory: string = ""
) {
  const files = fs.readdirSync(directoryPath);

  for (const file of files) {
    const filePath = path.join(directoryPath, file);
    const relativePath = path.join(baseDirectory, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      _deleteFilesNotInList(
        fileList,
        filePath,
        path.join(baseDirectory, path.basename(filePath))
      );
      if (fs.readdirSync(filePath).length === 0) {
        fs.rmdirSync(filePath);
      }
    } else if (stats.isFile() && !fileList.includes(relativePath)) {
      fs.unlinkSync(filePath);
    }
  }
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
