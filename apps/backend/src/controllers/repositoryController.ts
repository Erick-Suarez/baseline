import { NextFunction, Request, Response } from "express";
import {
  geRepositoriesWithEmbeddingsForOrganizationIdRequest,
  geRepositoriesWithEmbeddingsForOrganizationIdResponse,
} from "@baselinedocs/shared";
import { supabase } from "../lib/supabase.js";

export async function geRepositoriesWithEmbeddingsForOrganizationId(
  req: Request<geRepositoriesWithEmbeddingsForOrganizationIdRequest, {}, {}>,
  res: Response,
  next: NextFunction
) {
  try {
    const { organization_id } = req.params;
    if (organization_id === undefined) {
      req.log.info(`Request missing required keys`);
      return res.sendStatus(400);
    }
    const { data, error } = await supabase
      .from("repos")
      .select(
        "*, data_syncs!inner(source), embedding_indexes(index_name, updated_at, last_repo_commit->commit_sha, ready)"
      )
      .eq("data_syncs.organization_id", organization_id);
    if (error || !data) {
      req.log.error(error);
      return res.sendStatus(500);
    }

    return res
      .status(200)
      .json(data as geRepositoriesWithEmbeddingsForOrganizationIdResponse);
  } catch (err) {
    return next(err);
  }
}
