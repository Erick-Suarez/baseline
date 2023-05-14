import github from "./github.js";
import gitlab from "./gitlab.js";

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
  accessToken: string,
  repo: {
    provider_repo_id: string;
    repo_name: string;
    repo_owner: string;
    default_branch: string;
  }
) {
  if (provider === PROVIDERS.github) {
    return github.getHeadSha(accessToken, repo);
  }
  if (provider === PROVIDERS.gitlab) {
    return gitlab.getHeadSha(accessToken, repo);
  }
  throw new Error(`Unsuported Provider: ${provider}`);
}

export async function downloadRepository(
  provider: string,
  accessToken: string,
  repo: {
    provider_repo_id: string;
    repo_name: string;
    repo_owner: string;
  },
  sha: string,
  logger: any
) {
  if (provider === PROVIDERS.github) {
    return github.downloadRepository(accessToken, repo, sha, logger);
  }
  if (provider === PROVIDERS.gitlab) {
    return gitlab.downloadRepository(accessToken, repo, sha, logger);
  }
  throw new Error(`Unsuported Provider: ${provider}`);
}
