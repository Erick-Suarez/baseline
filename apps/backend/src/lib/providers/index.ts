import { RepositoryDiff } from "@baselinedocs/shared";
import github from "./github.js";
import gitlab from "./gitlab.js";
import {
  AccessTokenData,
  RepositoryModel,
} from "@baselinedocs/shared";
import { supabase } from "../supabase.js";

const PROVIDERS = {
  github: "github",
  gitlab: "gitlab",
};

export async function authenticate(provider: string, code: any) {
  if (provider === PROVIDERS.github) {
    return github.authenticate(code);
  }
  if (provider === PROVIDERS.gitlab) {
    return gitlab.authenticate(code);
  }
  throw new Error(`Unsuported Provider: ${provider}`);
}

export async function getRepositories(provider: string, accessToken: string) {
  if (provider === PROVIDERS.github) {
    return github.getRepositories(accessToken);
  }
  if (provider === PROVIDERS.gitlab) {
    return gitlab.getRepositories(accessToken);
  }
  throw new Error(`Unsuported Provider: ${provider}`);
}

export async function getHeadSha(
  provider: string,
  accessTokenData: AccessTokenData,
  repo: RepositoryModel,
) {
  if (provider === PROVIDERS.github) {
    return github.getHeadSha(accessTokenData.access_token, repo);
  }
  if (provider === PROVIDERS.gitlab) {
    const { access_token, created_at, expires_in, refresh_token } = accessTokenData;
    let validAccessToken = access_token;
    if(gitlab.isTokenExpired(created_at, expires_in)) {
      const response = await gitlab.refreshToken(refresh_token);
      await updateAccessTokenData(repo.data_sync_id, response);
      validAccessToken = response.access_token;
    }

    return gitlab.getHeadSha(validAccessToken, repo);
  }
  throw new Error(`Unsuported Provider: ${provider}`);
}

export async function downloadRepository(
  provider: string,
  accessTokenData: AccessTokenData,
  repo: RepositoryModel,
  sha: string,
  logger: any
) {
  if (provider === PROVIDERS.github) {
    return github.downloadRepository(accessTokenData.access_token, repo, sha, logger);
  }
  if (provider === PROVIDERS.gitlab) {
    const { access_token, created_at, expires_in, refresh_token } = accessTokenData;
    let validAccessToken = access_token;
    if(gitlab.isTokenExpired(created_at, expires_in)) {
      const response = await gitlab.refreshToken(refresh_token);
      await updateAccessTokenData(repo.data_sync_id, response);
      validAccessToken = response.access_token;
    }
    return gitlab.downloadRepository(accessTokenData.access_token, repo, sha, logger);
  }
  throw new Error(`Unsuported Provider: ${provider}`);
}

export async function getDiff(
  provider: string,
  accessTokenData: AccessTokenData,
  repo: RepositoryModel,
  base: string,
  head: string
): Promise<RepositoryDiff> {
  if (provider === PROVIDERS.github) {
    return github.getDiff(accessTokenData.access_token, repo, base, head);
  }
  if (provider === PROVIDERS.gitlab) {
    const { access_token, created_at, expires_in, refresh_token } = accessTokenData;
    let validAccessToken = access_token;
    if(gitlab.isTokenExpired(created_at, expires_in)) {
      const response = await gitlab.refreshToken(refresh_token);
      await updateAccessTokenData(repo.data_sync_id, response);
      validAccessToken = response.access_token;
    }
    return gitlab.getDiff(accessTokenData.access_token, repo, base, head);
  }
  throw new Error(`Unsuported Provider: ${provider}`);
}

async function updateAccessTokenData(dataSyncID: string, accessTokenData: AccessTokenData) {
  await supabase
      .from("data_syncs")
      .update({ access_token_data: {
        access_token: accessTokenData.access_token,
        token_type: accessTokenData.token_type,
        expires_in: accessTokenData.expires_in,
        refresh_token: accessTokenData.refresh_token,
        scope: accessTokenData.scope,
        created_at: accessTokenData.created_at,
      }})
      .eq("data_sync_id", dataSyncID);
}