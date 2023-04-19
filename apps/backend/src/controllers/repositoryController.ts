import express, { Request, Response } from "express";
import {
  geRepositoriesWithEmbeddingsForOrganizationIdRequest,
  geRepositoriesWithEmbeddingsForOrganizationIdResponse,
} from "@baselinedocs/shared";
import { supabase } from "../lib/supabase.js";

export async function geRepositoriesWithEmbeddingsForOrganizationId(
  req: Request<geRepositoriesWithEmbeddingsForOrganizationIdRequest, {}, {}>,
  res: Response
) {
  const request = req.params;
  const { data, error } = await supabase
    .from("repos")
    .select(
      "*, data_syncs!inner(source), embedding_indexes(index_name, updated_at, last_repo_commit->commit_sha, ready)"
    )
    .eq("data_syncs.organization_id", request.organization_id);

  if (error || !data) {
    console.error(error);
    return res.status(500).send();
  }

  res
    .status(200)
    .json(data as geRepositoriesWithEmbeddingsForOrganizationIdResponse);
}
