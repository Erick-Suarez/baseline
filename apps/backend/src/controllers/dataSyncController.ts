import { authGithub, getRepositories } from "../lib/github.js";
import * as dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import chalk from "chalk";

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || "",
  process.env.SUPABASE_SERVICE_ROLE_KEY || "",
  {
    db: { schema: "main" },
  }
);

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
    return { error };
  }

  const data_sync_id = data![0].data_sync_id;

  // Save repositories
  for await (const repository of repositories) {
    const { error } = await supabase.from("repos").insert({
      repo_name: repository.name,
      repo_owner: repository.owner.login,
      data_sync_id,
    });

    if (error) {
      return { error };
    }
  }

  return { error: null };
}
